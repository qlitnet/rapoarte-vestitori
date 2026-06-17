const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'rapoarte.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    role      TEXT NOT NULL CHECK(role IN ('admin','editor')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS groups_tbl (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    number  INTEGER UNIQUE NOT NULL,
    label   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS persons (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    group_number INTEGER NOT NULL,
    name         TEXT NOT NULL,
    FOREIGN KEY (group_number) REFERENCES groups_tbl(number)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    year      INTEGER NOT NULL,
    month     INTEGER NOT NULL,
    ore       TEXT DEFAULT '',
    stb       INTEGER DEFAULT NULL,
    rol       TEXT DEFAULT '',
    obs       TEXT DEFAULT '',
    UNIQUE(person_id, year, month),
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ── SEED (runs only once) ────────────────────────────────────
const seeded = null; // db.prepare("SELECT value FROM meta WHERE key='seeded'").get();

if (!seeded) {
  console.log('🌱 Seeding database...');

  const SEED = require('./seed.json');

  const insertGroup   = db.prepare('INSERT OR IGNORE INTO groups_tbl (number, label) VALUES (?, ?)');
  const insertPerson  = db.prepare('INSERT OR IGNORE INTO persons (id, group_number, name) VALUES (?, ?, ?)');
  const insertReport  = db.prepare(`
    INSERT OR IGNORE INTO reports (person_id, year, month, ore, stb, rol, obs)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    for (const g of SEED.groups) {
      insertGroup.run(g.number, g.label);
    }
    for (const p of SEED.persons) {
      insertPerson.run(p.id, p.group_number, p.name);
    }
    for (const r of SEED.reports) {
      insertReport.run(r.person_id, r.year, r.month, r.ore || '', r.stb || null, r.rol || '', r.obs || '');
    }
  });

  seedAll();

  // Create default admin
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, 'admin')").run('admin', hash);

  db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', '1')").run();
  console.log('✅ Seed complete. Default admin: admin / admin123');
}

module.exports = db;
