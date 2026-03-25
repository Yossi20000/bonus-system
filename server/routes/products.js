const express = require('express');
const { get, all, run, insert } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');
const router = express.Router();
router.use(authMiddleware);

// bonus_type options:
//   'profit_pct'   -> (sell_price / 1.03 - overhead - cost) * pct/100
//   'sell_pct'     -> sell_price * pct/100   (מגנים)
//   'fixed'        -> fixed amount
//   'none'         -> no bonus

function calculateBonus(product, sellPrice) {
  const price = parseFloat(sellPrice) || parseFloat(product.sell_price) || 0;
  const pct = parseFloat(product.bonus_value) || 0;

  if (product.bonus_type === 'profit_pct') {
    const overhead = parseFloat(product.overhead) || 0;
    const cost = parseFloat(product.cost) || 0;
    const profit = price / 1.03 - overhead - cost;
    return Math.round(profit * pct / 100 * 100) / 100;
  } else if (product.bonus_type === 'sell_pct') {
    return Math.round(price * pct / 100 * 100) / 100;
  } else if (product.bonus_type === 'fixed') {
    return pct;
  } else {
    return 0;
  }
}

router.get('/', (req, res) => res.json(all('SELECT * FROM products WHERE active = 1 ORDER BY name')));
router.get('/all', adminOnly, (req, res) => res.json(all('SELECT * FROM products ORDER BY name')));

router.post('/', adminOnly, (req, res) => {
  const { name, catalog_price, sell_price, bonus_type, bonus_value, cost, overhead } = req.body;
  if (!name || bonus_value === undefined) return res.status(400).json({ error: 'חסרים שדות חובה' });
  const id = insert(
    'INSERT INTO products (name, catalog_price, sell_price, bonus_type, bonus_value, cost, overhead) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, catalog_price || null, sell_price || null, bonus_type || 'profit_pct', bonus_value, cost || null, overhead ?? 100]
  );
  res.status(201).json({ id });
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, catalog_price, sell_price, bonus_type, bonus_value, cost, overhead, active } = req.body;
  if (!get('SELECT id FROM products WHERE id = ?', [req.params.id])) return res.status(404).json({ error: 'מוצר לא נמצא' });
  run(
    'UPDATE products SET name=?, catalog_price=?, sell_price=?, bonus_type=?, bonus_value=?, cost=?, overhead=?, active=? WHERE id=?',
    [name, catalog_price || null, sell_price || null, bonus_type, bonus_value, cost || null, overhead ?? 100,
     active !== undefined ? (active ? 1 : 0) : 1, req.params.id]
  );
  res.json({ success: true });
});

router.delete('/:id', adminOnly, (req, res) => {
  run('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
module.exports.calculateBonus = calculateBonus;
