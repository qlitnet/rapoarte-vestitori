const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/init');
const { signToken, requireAuth, requireAdmin } = require('../auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username și parola sunt obligatorii' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Username sau parolă greșite' });

  const token = signToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({ id: user.id, username: user.username, role: user.role });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// ── USER MANAGEMENT (admin only) ──────────────────────────

// GET /api/auth/users
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, role, created_at FROM users ORDER BY id").all();
  res.json(users);
});

// POST /api/auth/users
router.post('/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ error: 'Username, parola și rolul sunt obligatorii' });
  if (!['admin', 'editor'].includes(role))
    return res.status(400).json({ error: 'Rol invalid (admin sau editor)' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username.trim(), hash, role);
    res.json({ id: result.lastInsertRowid, username: username.trim(), role });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username deja folosit' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/auth/users/:id — change password or role
router.put('/users/:id', requireAdmin, (req, res) => {
  const { password, role } = req.body;
  const id = parseInt(req.params.id);

  // Prevent demoting yourself
  if (req.user.id === id && role && role !== 'admin')
    return res.status(400).json({ error: 'Nu îți poți schimba propriul rol' });

  if (role && !['admin', 'editor'].includes(role))
    return res.status(400).json({ error: 'Rol invalid' });

  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere' });
    const hash = bcrypt.hashSync(password, 10);
    if (role) {
      db.prepare('UPDATE users SET password=?, role=? WHERE id=?').run(hash, role, id);
    } else {
      db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, id);
    }
  } else if (role) {
    db.prepare('UPDATE users SET role=? WHERE id=?').run(role, id);
  }

  const updated = db.prepare("SELECT id, username, role, created_at FROM users WHERE id=?").get(id);
  res.json(updated);
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (req.user.id === id)
    return res.status(400).json({ error: 'Nu îți poți șterge propriul cont' });
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  res.json({ ok: true });
});

module.exports = router;
