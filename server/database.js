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
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free(); return rows;
}

function insert(sql, params = []) {
  db.run(sql, params);
  const r = get('SELECT last_insert_rowid() as id');
  saveDb();
  return r?.id;
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, catalog_price REAL, sell_price REAL, bonus_type TEXT NOT NULL DEFAULT 'percent', bonus_value REAL NOT NULL DEFAULT 5.5, cost REAL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, customer_name TEXT NOT NULL, sale_date TEXT NOT NULL, total_bonus REAL NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (employee_id) REFERENCES users(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, sell_price REAL NOT NULL, bonus_amount REAL NOT NULL, FOREIGN KEY (sale_id) REFERENCES sales(id), FOREIGN KEY (product_id) REFERENCES products(id))`);
  saveDb();
}

function seedInitialData() {
  if (!get('SELECT id FROM users WHERE username = ?', ['admin'])) {
    const hash = bcrypt.hashSync('admin123', 10);
    insert('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)', ['מנהל מערכת', 'admin', hash, 'admin']);
  }
  const cnt = get('SELECT COUNT(*) as c FROM products');
  if (!cnt || cnt.c === 0) seedProducts();
}

function seedProducts() {
  const products = [
    ['Samsung A06 4/64', null, 700, 'percent', 5.5, 298],
    ['Samsung A07', null, 700, 'percent', 5.5, 312],
    ['Samsung A16 4/128', 1200, 1200, 'percent', 5.5, 395],
    ['Samsung A16 8/256', null, 900, 'percent', 5.5, 688],
    ['Samsung A17 4/128', null, 950, 'percent', 5.5, 484],
    ['Samsung A17 8/256', null, 1200, 'percent', 5.5, 605],
    ['Samsung A26 6/128', 1399, 1200, 'percent', 5.5, 640],
    ['Samsung A26 8/256', 1599, 1299, 'percent', 5.5, 800],
    ['Samsung A36 8/128', 1599, 1450, 'percent', 5.5, 822],
    ['Samsung A36 12/256', 1999, 2000, 'percent', 5.5, 945],
    ['Samsung A56 8/128', 1999, 2000, 'percent', 5.5, 1121],
    ['Samsung A56 12/256', 2299, 2250, 'percent', 5.5, 1300],
    ['Samsung S21 FE 128GB', 2100, null, 'percent', 5.5, 1060],
    ['Samsung S21 FE 256GB', 2350, 2100, 'percent', 5.5, 1160],
    ['Samsung S22 128GB', 2699, 2150, 'percent', 5.5, 1350],
    ['Samsung S22 256GB', 2900, null, 'percent', 5.5, 1350],
    ['Samsung S24 128GB', 2999, 3000, 'percent', 5.5, 1890],
    ['Samsung S24 256GB', 2999, 2900, 'percent', 5.5, 2100],
    ['Samsung S24 FE 256GB', 2399, 1800, 'percent', 5.5, 1580],
    ['Samsung S24 FE 128GB', 2399, 1800, 'percent', 5.5, 1420],
    ['Samsung S25 256GB', null, 3350, 'percent', 5.5, 2400],
    ['Samsung S25 512GB', null, 3900, 'percent', 5.5, 2900],
    ['Samsung S25 Ultra 256GB', null, 4330, 'percent', 5.5, 3050],
    ['Samsung S25 Ultra 512GB', null, 4600, 'percent', 5.5, 3700],
    ['Samsung S25 Ultra 1TB', null, null, 'percent', 5.5, 5000],
    ['Samsung Tab A9+ X216 4/64', 1200, 1400, 'percent', 5.5, 750],
    ['Samsung Tab A9+ X216 8/128', 1450, 1600, 'percent', 5.5, 840],
    ['Samsung Tab A9 X115 4/64', 999, 1200, 'percent', 5.5, 520],
    ['Samsung Tab A9 X115 8/128', 1250, 1500, 'percent', 5.5, 590],
    ['Samsung Tab X516 6/128', 2549, 2390, 'percent', 5.5, 1450],
    ['Samsung Tab X616 6/128', null, null, 'percent', 5.5, 1650],
    ['Samsung Tab Active5 X306 6/128', 2699, 2600, 'percent', 7.0, 1700],
    ['Samsung Tab Active5 X306 8/256', 3300, 3350, 'percent', 5.5, 2200],
    ['Samsung Tab S9 5G X716', 4400, 4000, 'percent', 5.5, 2700],
    ['Samsung Tab X526', null, 2500, 'percent', 5.5, 1650],
    ['Samsung F22', null, 990, 'percent', 5.5, 430],
    ['Samsung X135', null, 1550, 'percent', 5.5, 590],
    ['Gili Star', null, 1950, 'percent', 5.5, 950],
    ['הקשחת מכשיר והתקנת מערכת הגנה', 300, 300, 'percent', 5.5, 150],
    ['מגנים', null, 150, 'percent_fixed', 15, null],
    ['משלוח', null, null, 'fixed', 5, null],
    ['הגנה מלאה', null, null, 'fixed', 20, null],
    ['הגנה חודשית', null, null, 'fixed', 10, null],
    ['הגנה מלאה - חידוש', null, null, 'fixed', 10, null],
    ['הגנה חודשית - חידוש', null, null, 'fixed', 5, null],
    ['סים וייז', null, null, 'fixed', 15, null],
  ];
  for (const p of products) {
    db.run('INSERT INTO products (name, catalog_price, sell_price, bonus_type, bonus_value, cost) VALUES (?, ?, ?, ?, ?, ?)', p);
  }
  saveDb();
  console.log(`Seeded ${products.length} products`);
}

module.exports = { initDb, getDb: () => db, run, get, all, insert, saveDb };
