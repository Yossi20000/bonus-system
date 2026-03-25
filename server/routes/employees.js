const express = require('express');
const bcrypt = require('bcryptjs');
const { get, all, run, insert } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware');
const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const employees = req.user.role === 'admin'
    ? all('SELECT id, name, username, role, active, created_at FROM users ORDER BY name')
    : all('SELECT id, name, username, role FROM users WHERE id = ? AND active = 1', [req.user.id]);
  res.json(employees);
});

router.post('/', adminOnly, (req, res) => {
  const { name, username, password, role = 'employee' } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'חסרים שדות חובה' });
  if (password.length < 4) return res.status(400).json({ error: 'סיסמה חייבת להיות לפחות 4 תווים' });
  if (get('SELECT id FROM users WHERE username = ?', [username])) return res.status(409).json({ error: 'שם המשתמש כבר קיים' });
  const id = insert('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)', [name, username, bcrypt.hashSync(password, 10), role]);
  res.status(201).json({ id, name, username, role });
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, username, password, role, active } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'עובד לא נמצא' });
  if (username && username !== user.username && get('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.params.id])) return res.status(409).json({ error: 'שם המשתמש כבר קיים' });
  if (password && password.length < 4) return res.status(400).json({ error: 'סיסמה חייבת להיות לפחות 4 תווים' });
  run('UPDATE users SET name=?, username=?, password=?, role=?, active=? WHERE id=?',
    [name || user.name, username || user.username, password ? bcrypt.hashSync(password, 10) : user.password, role || user.role, active !== undefined ? (active ? 1 : 0) : user.active, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', adminOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'לא ניתן למחוק את המשתמש הנוכחי' });
  run('UPDATE users SET active = 0 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
