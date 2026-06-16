const express = require('express');
const db = require('../db/init');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/groups
router.get('/', requireAuth, (req, res) => {
  const groups = db.prepare('SELECT * FROM groups_tbl ORDER BY number').all();
  res.json(groups);
});

// POST /api/groups  (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { number, label } = req.body;
  if (!number || isNaN(number))
    return res.status(400).json({ error: 'Numărul grupei este obligatoriu' });
  try {
    const lbl = label?.trim() || `Grupa ${number}`;
    const result = db.prepare('INSERT INTO groups_tbl (number, label) VALUES (?, ?)').run(parseInt(number), lbl);
    res.json({ id: result.lastInsertRowid, number: parseInt(number), label: lbl });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Grupă cu acest număr există deja' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/groups/:number  (admin only)
router.put('/:number', requireAdmin, (req, res) => {
  const number = parseInt(req.params.number);
  const { label } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'Numele grupei este obligatoriu' });
  db.prepare('UPDATE groups_tbl SET label=? WHERE number=?').run(label.trim(), number);
  res.json({ number, label: label.trim() });
});

// DELETE /api/groups/:number  (admin only)
router.delete('/:number', requireAdmin, (req, res) => {
  const number = parseInt(req.params.number);
  // Delete all persons (and cascade reports) in this group
  db.prepare('DELETE FROM persons WHERE group_number=?').run(number);
  db.prepare('DELETE FROM groups_tbl WHERE number=?').run(number);
  res.json({ ok: true });
});

module.exports = router;
