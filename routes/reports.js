const express = require('express');
const db = require('../db/init');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/reports?year=2026&month=5
router.get('/', requireAuth, (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year și month sunt obligatorii' });

  const rows = db.prepare(`
    SELECT
      p.id        AS person_id,
      p.name,
      p.group_number,
      g.label     AS group_label,
      r.id        AS report_id,
      r.ore,
      r.stb,
      r.rol,
      r.obs
    FROM persons p
    JOIN groups_tbl g ON g.number = p.group_number
    LEFT JOIN reports r ON r.person_id = p.id AND r.year = ? AND r.month = ?
    ORDER BY p.group_number, p.name
  `).all(parseInt(year), parseInt(month));

  res.json(rows);
});

// GET /api/reports/months — list all year/month combos that have data
router.get('/months', requireAuth, (req, res) => {
  const months = db.prepare(`
    SELECT DISTINCT year, month
    FROM reports
    WHERE ore != '' OR stb IS NOT NULL OR rol != '' OR obs != ''
    ORDER BY year, month
  `).all();
  res.json(months);
});

// PUT /api/reports/:personId/:year/:month — upsert a report row (auth required, any role)
router.put('/:personId/:year/:month', requireAuth, (req, res) => {
  const personId = parseInt(req.params.personId);
  const year     = parseInt(req.params.year);
  const month    = parseInt(req.params.month);

  // Editors can ONLY touch ore, stb, rol, obs
  const { ore, stb, rol, obs } = req.body;

  // Validate ore
  const oreVal = (ore || '').toString().trim().toUpperCase();
  if (oreVal !== '' && oreVal !== 'DA' && oreVal !== 'NU' && isNaN(oreVal))
    return res.status(400).json({ error: 'ORE: DA, NU sau număr' });

  // Validate rol
  const rolVal = (rol || '').toString().trim().toUpperCase();
  if (rolVal !== '' && !['PA', 'PR', 'V'].includes(rolVal))
    return res.status(400).json({ error: 'ROL: PA, PR sau V' });

  const stbVal = stb !== null && stb !== undefined && stb !== '' ? parseInt(stb) : null;

  db.prepare(`
    INSERT INTO reports (person_id, year, month, ore, stb, rol, obs)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(person_id, year, month) DO UPDATE SET
      ore = excluded.ore,
      stb = excluded.stb,
      rol = excluded.rol,
      obs = excluded.obs
  `).run(personId, year, month, oreVal, stbVal, rolVal, obs?.trim() || '');

  res.json({ ok: true });
});

// GET /api/reports/summary?year=2026&month=5 — centralizator
router.get('/summary', requireAuth, (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year și month sunt obligatorii' });

  const rows = db.prepare(`
    SELECT rol,
      COUNT(*) as count,
      SUM(CASE WHEN ore NOT IN ('', 'DA', 'NU') AND ore GLOB '*[0-9]*' THEN CAST(ore AS INTEGER) ELSE 0 END) as total_ore,
      SUM(COALESCE(stb, 0)) as total_stb
    FROM reports
    WHERE year=? AND month=? AND rol != ''
    GROUP BY rol
  `).all(parseInt(year), parseInt(month));

  const total = db.prepare('SELECT COUNT(DISTINCT person_id) as cnt FROM reports WHERE year=? AND month=?')
    .get(parseInt(year), parseInt(month));

  res.json({ rows, total: total?.cnt || 0 });
});

module.exports = router;
