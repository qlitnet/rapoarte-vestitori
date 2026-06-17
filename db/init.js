const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'rapoarte.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// DELETE old DB to force fresh seed
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('🗑️ Old database deleted, rebuilding...');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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

console.log('🌱 Seeding database...');
const SEED = require('./seed.json');

const insertGroup  = db.prepare('INSERT OR IGNORE INTO groups_tbl (number, label) VALUES (?, ?)');
const insertPerson = db.prepare('INSERT OR IGNORE INTO persons (id, group_number, name) VALUES (?, ?, ?)');
const insertReport = db.prepare(`
  INSERT OR IGNORE INTO reports (person_id, year, month, ore, stb, rol, obs)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const seedAll = db.transaction(() => {
  for (const g of SEED.groups) insertGroup.run(g.number, g.label);
  for (const p of SEED.persons)
