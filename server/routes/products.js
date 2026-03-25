const express = require('express');
const { get, all, run, insert } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');
const router = express.Router();
router.use(authMiddleware);

function calculateBonus(product, sellPrice) {
  const price = sellPrice !== undefined ? parseFloat(sellPrice) : (product.sell_price || 0);
  if (product.bonus_type === 'fixed') return product.bonus_value;
  return Math.round(price * product.bonus_value / 100 * 100) / 100;
}

router.get('/', (req, res) => res.json(all('SELECT * FROM products WHERE active = 1 ORDER BY name')));
router.get('/all', adminOnly, (req, res) => res.json(all('SELECT * FROM products ORDER BY name')));

router.post('/', adminOnly, (req, res) => {
  const { name, catalog_price, sell_price, bonus_type, bonus_value, cost } = req.body;
  if (!name || bonus_value === undefined) return res.status(400).json({ error: 'חסרים שדות חובה' });
  const id = insert('INSERT INTO products (name, catalog_price, sell_price, bonus_type, bonus_value, cost) VALUES (?, ?, ?, ?, ?, ?)',
    [name, catalog_price || null, sell_price || null, bonus_type || 'percent', bonus_value, cost || null]);
  res.status(201).json({ id });
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, catalog_price, sell_price, bonus_type, bonus_value, cost, active } = req.body;
  if (!get('SELECT id FROM products WHERE id = ?', [req.params.id])) return res.status(404).json({ error: 'מוצר לא נמצא' });
  run('UPDATE products SET name=?, catalog_price=?, sell_price=?, bonus_type=?, bonus_value=?, cost=?, active=? WHERE id=?',
    [name, catalog_price || null, sell_price || null, bonus_type, bonus_value, cost || null, active !== undefined ? (active ? 1 : 0) : 1, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', adminOnly, (req, res) => {
  run('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
module.exports.calculateBonus = calculateBonus;
