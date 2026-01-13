const path = require("path");
const Database = require("better-sqlite3");

// Create / open the database files
const dbPath = path.join(__dirname, "tracklist.db");
const db = new Database(dbPath);

// Enable Foreign keys
db.pragma("foreign_keys = ON");

// ----- Schema Initialization -----

db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        dueDate TEXT
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS groceries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        expanded INTEGER NOT NULL DEFAULT 0
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS grocery_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grocery_id INTEGER NOT NULL,
        purchased_at TEXT NOT NULL,
        FOREIGN KEY (grocery_id) REFERENCES groceries(id) ON DELETE CASCADE
    )
`).run();

module.exports = db;