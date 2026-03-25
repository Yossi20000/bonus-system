const express = require('express');
const XLSX = require('xlsx');
const { get, all, run, insert } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');
const router = express.Router();
router.use(authMiddleware);

function calculateBonus(product, sellPrice) {
  const price = sellPrice !== undefined ? parseFloat(sellPrice) : (product.sell_price || 0);
  if (product.bonus_type === 'fixed') return product.bonus_value;
  return Math.round(price * product.bonus_value / 100 * 100) / 100;
}

router.get('/', (req, res) => {
  const { employee_id, product_id, date_from, date_to, month, year } = req.query;
  const wheres = ['1=1'];
  const params = [];

  if (req.user.role !== 'admin') { wheres.push('s.employee_id = ?'); params.push(req.user.id); }
  else if (employee_id) { wheres.push('s.employee_id = ?'); params.push(employee_id); }
  if (date_from) { wheres.push('s.sale_date >= ?'); params.push(date_from); }
  if (date_to) { wheres.push('s.sale_date <= ?'); params.push(date_to); }
  if (month && year) { wheres.push("strftime('%m', s.sale_date) = ? AND strftime('%Y', s.sale_date) = ?"); params.push(String(month).padStart(2,'0'), String(year)); }
  else if (year) { wheres.push("strftime('%Y', s.sale_date) = ?"); params.push(String(year)); }

  const sales = all(`SELECT s.id, s.sale_date, s.customer_name, s.total_bonus, s.notes, s.employee_id, u.name as employee_name FROM sales s JOIN users u ON s.employee_id = u.id WHERE ${wheres.join(' AND ')} ORDER BY s.sale_date DESC, s.id DESC`, params);

  const result = sales.map(sale => {
    const items = all('SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?', [sale.id]);
    return { ...sale, items };
  });
  
  const filtered = product_id ? result.filter(s => s.items.some(i => String(i.product_id) === String(product_id))) : result;
  res.json(filtered);
});

router.get('/summary', adminOnly, (req, res) => {
  const { employee_id, date_from, date_to, month, year, group_by = 'employee' } = req.query;
  const wheres = ['1=1'];
  const params = [];

  if (employee_id) { wheres.push('s.employee_id = ?'); params.push(employee_id); }
  if (date_from) { wheres.push('s.sale_date >= ?'); params.push(date_from); }
  if (date_to) { wheres.push('s.sale_date <= ?'); params.push(date_to); }
  if (month && year) { wheres.push("strftime('%m', s.sale_date) = ? AND strftime('%Y', s.sale_date) = ?"); params.push(String(month).padStart(2,'0'), String(year)); }
  else if (year) { wheres.push("strftime('%Y', s.sale_date) = ?"); params.push(String(year)); }
  const w = wheres.join(' AND ');

  let query;
  // FIX: Use SUM(si.bonus_amount * si.quantity) instead of SUM(s.total_bonus) to avoid duplication when joining sale_items
  if (group_by === 'employee') {
    query = `SELECT u.id as employee_id, u.name as employee_name,
      COUNT(DISTINCT s.id) as sale_count,
      SUM(si.bonus_amount * si.quantity) as total_bonus,
      SUM(si.sell_price * si.quantity) as total_revenue
      FROM sales s JOIN users u ON s.employee_id = u.id JOIN sale_items si ON si.sale_id = s.id
      WHERE ${w} GROUP BY u.id ORDER BY total_bonus DESC`;
  } else if (group_by === 'month') {
    query = `SELECT u.name as employee_name, strftime('%Y-%m', s.sale_date) as period,
      COUNT(DISTINCT s.id) as sale_count,
      SUM(si.bonus_amount * si.quantity) as total_bonus,
      SUM(si.sell_price * si.quantity) as total_revenue
      FROM sales s JOIN users u ON s.employee_id = u.id JOIN sale_items si ON si.sale_id = s.id
      WHERE ${w} GROUP BY u.id, period ORDER BY period DESC, total_bonus DESC`;
  } else if (group_by === 'day') {
    query = `SELECT u.name as employee_name, s.sale_date as period,
      COUNT(DISTINCT s.id) as sale_count,
      SUM(si.bonus_amount * si.quantity) as total_bonus,
      SUM(si.sell_price * si.quantity) as total_revenue
      FROM sales s JOIN users u ON s.employee_id = u.id JOIN sale_items si ON si.sale_id = s.id
      WHERE ${w} GROUP BY u.id, s.sale_date ORDER BY s.sale_date DESC, total_bonus DESC`;
  } else {
    query = `SELECT p.name as product_name, p.id as product_id,
      SUM(si.quantity) as total_qty,
      SUM(si.bonus_amount * si.quantity) as total_bonus,
      SUM(si.sell_price * si.quantity) as total_revenue
      FROM sales s JOIN sale_items si ON si.sale_id = s.id JOIN products p ON si.product_id = p.id
      WHERE ${w} GROUP BY p.id ORDER BY total_bonus DESC`;
  }
  res.json(all(query, params));
});

router.post('/', (req, res) => {
  const { customer_name, sale_date, items, notes } = req.body;
  const employee_id = req.user.role === 'admin' && req.body.employee_id ? req.body.employee_id : req.user.id;
  if (!customer_name || !items?.length) return res.status(400).json({ error: 'חסרים שדות חובה' });

  let totalBonus = 0;
  const validatedItems = [];
  for (const item of items) {
    const product = get('SELECT * FROM products WHERE id = ? AND active = 1', [item.product_id]);
    if (!product) return res.status(400).json({ error: `מוצר לא נמצא: ${item.product_id}` });
    const sellPrice = parseFloat(item.sell_price) || product.sell_price || 0;
    const qty = parseInt(item.quantity) || 1;
    const bonus = calculateBonus(product, sellPrice);
    totalBonus += bonus * qty;
    validatedItems.push({ product_id: product.id, quantity: qty, sell_price: sellPrice, bonus_amount: bonus });
  }

  const saleId = insert('INSERT INTO sales (employee_id, customer_name, sale_date, total_bonus, notes) VALUES (?, ?, ?, ?, ?)',
    [employee_id, customer_name, sale_date || new Date().toISOString().split('T')[0], totalBonus, notes || null]);
  
  for (const item of validatedItems) {
    run('INSERT INTO sale_items (sale_id, product_id, quantity, sell_price, bonus_amount) VALUES (?, ?, ?, ?, ?)',
      [saleId, item.product_id, item.quantity, item.sell_price, item.bonus_amount]);
  }
  res.status(201).json({ id: saleId, total_bonus: totalBonus });
});

router.delete('/:id', adminOnly, (req, res) => {
  if (!get('SELECT id FROM sales WHERE id = ?', [req.params.id])) return res.status(404).json({ error: 'מכירה לא נמצאה' });
  run('DELETE FROM sale_items WHERE sale_id = ?', [req.params.id]);
  run('DELETE FROM sales WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/export', adminOnly, (req, res) => {
  const { type = 'sales' } = req.query;
  let data, sheetName;
  if (type === 'summary') {
    data = all(`SELECT u.name as 'עובד', strftime('%Y-%m', s.sale_date) as 'חודש',
      COUNT(DISTINCT s.id) as 'מכירות',
      ROUND(SUM(si.bonus_amount * si.quantity), 2) as 'סה"כ בונוס',
      ROUND(SUM(si.sell_price * si.quantity), 2) as 'הכנסות'
      FROM sales s JOIN users u ON s.employee_id = u.id JOIN sale_items si ON si.sale_id = s.id
      GROUP BY u.id, strftime('%Y-%m', s.sale_date) ORDER BY 'חודש' DESC, u.name`);
    sheetName = 'סיכום';
  } else if (type === 'products') {
    data = all("SELECT name as 'שם מוצר', catalog_price as 'מחירון', sell_price as 'מחיר מכירה', bonus_type as 'סוג בונוס', bonus_value as 'ערך בונוס' FROM products WHERE active=1 ORDER BY name");
    sheetName = 'מוצרים';
  } else {
    data = all(`SELECT s.sale_date as 'תאריך', u.name as 'עובד', s.customer_name as 'לקוח',
      p.name as 'מוצר', si.quantity as 'כמות', si.sell_price as 'מחיר מכירה',
      ROUND(si.bonus_amount * si.quantity, 2) as 'בונוס'
      FROM sales s JOIN users u ON s.employee_id = u.id
      JOIN sale_items si ON si.sale_id = s.id JOIN products p ON si.product_id = p.id
      ORDER BY s.sale_date DESC`);
    sheetName = 'מכירות';
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheetName);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="export-${type}-${Date.now()}.xlsx"`);
  res.send(buffer);
});

module.exports = router;
