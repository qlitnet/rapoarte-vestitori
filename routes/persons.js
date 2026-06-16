const express = require('express');
const db = require('../db/init');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/persons
router.get('/', requireAuth, (req, res) => {
  const persons = db.prepare(`
    SELECT p.id, p.group_number, p.name, g.label as group_label
    FROM persons p
    JOIN groups_tbl g ON g.number = p.group_number
    ORDER BY p.group_number, p.name
  `).all();
  res.json(persons);
});

// POST /api/persons  (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { name, group_number } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Numele este obligatoriu' });
  if (!group_number) return res.status(400).json({ error: 'Grupa este obligatorie' });

  const result = db.prepare('INSERT INTO persons (name, group_number) VALUES (?, ?)').run(name.trim().toUpperCase(), parseInt(group_number));
  res.json({ id: result.lastInsertRowid, name: name.trim().toUpperCase(), group_number: parseInt(group_number) });
});

// PUT /api/persons/:id  (admin only) — rename or move group
router.put('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { name, group_number } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Numele este obligatoriu' });

  db.prepare('UPDATE persons SET name=?, group_number=? WHERE id=?').run(
    name.trim().toUpperCase(),
    parseInt(group_number),
    id
  );
  res.json({ id, name: name.trim().toUpperCase(), group_number: parseInt(group_number) });
});

// DELETE /api/persons/:id  (admin only) — deletes person + all reports
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM persons WHERE id=?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
