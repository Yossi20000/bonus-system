const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'bonus.db');
let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  createTables();
  migrate();
  seedInitialData();
  console.log('DB ready');
  return db;
}

function saveDb() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}
function run(sql, params = []) { db.run(sql, params); saveDb(); }
function get(sql, params = []) {
  const s = db.prepare(sql); s.bind(params);
  const row = s.step() ? s.getAsObject() : null;
  s.free(); return row;
}
function all(sql, params = []) {
  const s = db.prepare(sql); s.bind(params);
  const rows = []; while (s.step()) rows.push(s.getAsObject());
  s.free(); return rows;
}
function insert(sql, params = []) {
  db.run(sql, params);
  const r = get('SELECT last_insert_rowid() as id');
  saveDb(); return r?.id;
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee', active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, catalog_price REAL, sell_price REAL,
    bonus_type TEXT NOT NULL DEFAULT 'profit_pct',
    bonus_value REAL NOT NULL DEFAULT 5.5,
    cost REAL, overhead REAL DEFAULT 100,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL, customer_name TEXT NOT NULL,
    sale_date TEXT NOT NULL, total_bonus REAL NOT NULL DEFAULT 0, notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1, sell_price REAL NOT NULL, bonus_amount REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id), FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  saveDb();
}

function migrate() {
  // Add overhead column if missing
  try { db.run('ALTER TABLE products ADD COLUMN overhead REAL DEFAULT 100'); saveDb(); } catch(e) {}
  // Add migrations table if missing
  try { db.run(`CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`); saveDb(); } catch(e) {}

  // Migration 1: fix bonus_type from old percent/fixed to new profit_pct/sell_pct/none
  const m1 = get('SELECT id FROM migrations WHERE id = 1');
  if (!m1) {
    console.log('Running migration 1: fix all product bonus types...');
    const productData = getProductData();
    for (const p of productData) {
      const [name, sell_price, bonus_type, bonus_value, cost, overhead] = p;
      // Delete old record and re-insert with correct data
      db.run('DELETE FROM products WHERE name = ?', [name]);
      db.run(
        'INSERT INTO products (name, sell_price, bonus_type, bonus_value, cost, overhead) VALUES (?, ?, ?, ?, ?, ?)',
        [name, sell_price ?? null, bonus_type, bonus_value, cost ?? null, overhead]
      );
    }
    db.run('INSERT INTO migrations (id) VALUES (1)');
    saveDb();
    console.log('Migration 1 complete: all products updated with correct bonus calculations');
  }
}

function seedInitialData() {
  if (!get('SELECT id FROM users WHERE username = ?', ['admin'])) {
    const hash = bcrypt.hashSync('admin123', 10);
    insert('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
      ['מנהל מערכת', 'admin', hash, 'admin']);
  }
  const cnt = get('SELECT COUNT(*) as c FROM products');
  if (!cnt || cnt.c === 0) {
    for (const p of getProductData()) {
      const [name, sell_price, bonus_type, bonus_value, cost, overhead] = p;
      db.run('INSERT INTO products (name, sell_price, bonus_type, bonus_value, cost, overhead) VALUES (?, ?, ?, ?, ?, ?)',
        [name, sell_price ?? null, bonus_type, bonus_value, cost ?? null, overhead]);
    }
    saveDb();
    console.log('Products seeded');
  }
}

function getProductData() {
  // [name, sell_price, bonus_type, bonus_value(%), cost, overhead]
  // profit_pct: bonus = (sell/1.03 - overhead - cost) * pct%
  // sell_pct:   bonus = sell * pct%
  // none:       bonus = 0
  return [
    ['Samsung A06 4/64',              700,  'profit_pct', 5.5,  298,  100],
    ['Samsung A07',                   700,  'profit_pct', 5.5,  312,  100],
    ['Samsung A16 4/128',            1200,  'profit_pct', 5.5,  395,    0],
    ['Samsung A16 8/256',             900,  'profit_pct', 5.5,  688,    0],
    ['Samsung A17 4/128',             950,  'profit_pct', 5.5,  484,    0],
    ['Samsung A17 8/256',            1200,  'profit_pct', 5.5,  605,    0],
    ['Samsung A26 6/128',            1200,  'profit_pct', 5.5,  640,    0],
    ['Samsung A26 8/256',            1299,  'profit_pct', 5.5,  800,    0],
    ['Samsung A36 8/128',            1450,  'profit_pct', 5.5,  822,    0],
    ['Samsung A36 12/256',           2000,  'profit_pct', 5.5,  945,    0],
    ['Samsung A56 8/128',            2000,  'profit_pct', 5.5, 1121,    0],
    ['Samsung A56 12/256',           2250,  'profit_pct', 5.5, 1300,    0],
    ['Samsung S21 FE 128GB',            0,  'profit_pct', 5.5, 1060,    0],
    ['Samsung S21 FE 256GB',         2100,  'profit_pct', 5.5, 1160,    0],
    ['Samsung S22 128GB',            2150,  'profit_pct', 5.5, 1350,    0],
    ['Samsung S22 256GB',            null,  'profit_pct', 5.5, 1350,  100],
    ['Samsung S24 128GB',            3000,  'profit_pct', 5.5, 1890,  100],
    ['Samsung S24 256GB',            2900,  'profit_pct', 5.5, 2100,  100],
    ['Samsung S24 FE 256GB',         1800,  'profit_pct', 5.5, 1580,  100],
    ['Samsung S24 FE 128GB',         1800,  'profit_pct', 5.5, 1420,  100],
    ['Samsung S25 256GB',            3350,  'profit_pct', 5.5, 2400,  100],
    ['Samsung S25 512GB',            3900,  'profit_pct', 5.5, 2900,  100],
    ['Samsung S25 Ultra 256GB',      4330,  'profit_pct', 5.5, 3050,  100],
    ['Samsung S25 Ultra 512GB',      4600,  'profit_pct', 5.5, 3700,  100],
    ['Samsung S25 Ultra 1TB',        null,  'profit_pct', 5.5, 5000,  100],
    ['Samsung Tab A9+ X216 4/64',    1400,  'profit_pct', 5.5,  750,  100],
    ['Samsung Tab A9+ X216 8/128',   1600,  'profit_pct', 5.5,  840,  100],
    ['Samsung Tab A9 X115 4/64',     1200,  'profit_pct', 5.5,  520,  100],
    ['Samsung Tab A9 X115 8/128',    1500,  'profit_pct', 5.5,  590,  100],
    ['Samsung Tab X516 6/128',       2390,  'profit_pct', 5.5, 1450,  100],
    ['Samsung Tab X616 6/128',       null,  'profit_pct', 5.5, 1650,  100],
    ['Samsung Tab Active5 X306 6/128',2600, 'profit_pct', 7.0, 1700,  100],
    ['Samsung Tab Active5 X306 8/256',3350, 'profit_pct', 5.5, 2200,  100],
    ['Samsung Tab S9 5G X716',       4000,  'profit_pct', 5.5, 2700,  100],
    ['Samsung Tab X526',             2500,  'profit_pct', 5.5, 1650,  100],
    ['Samsung F22',                   990,  'profit_pct', 5.5,  430,  100],
    ['Samsung X135',                 1550,  'profit_pct', 5.5,  590,  100],
    ['Gili Star',                    1950,  'profit_pct', 5.5,  950,  100],
    ['הקשחת מכשיר והתקנת מערכת הגנה', 300, 'profit_pct', 5.5,  150,  100],
    ['מגנים',                         150,  'sell_pct',  15.0, null,    0],
    ['משלוח',                         null, 'none',        0,  null,    0],
    ['הגנה מלאה',                     null, 'none',        0,  null,    0],
    ['הגנה חודשית',                   null, 'none',        0,  null,    0],
    ['הגנה מלאה - חידוש',             null, 'none',        0,  null,    0],
    ['הגנה חודשית - חידוש',           null, 'none',        0,  null,    0],
    ['סים וייז',                      null, 'none',        0,  null,    0],
  ];
}

module.exports = { initDb, getDb: () => db, run, get, all, insert, saveDb };
