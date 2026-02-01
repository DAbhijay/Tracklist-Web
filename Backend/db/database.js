const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

// Use persistent storage on Render, fallback to local for development
const isProd = process.env.NODE_ENV === "production";
const dbDir = isProd 
  ? "/opt/render/project/data"  // Persistent storage on Render
  : path.join(__dirname, "db");  // Local development

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "tracklist.db");
console.log(`📁 Database location: ${dbPath}`);

// Create / open the database file
const db = new Database(dbPath);

// Enable Foreign keys
db.pragma("foreign_keys = ON");

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

// ----- Schema Initialization -----

// Add username column to tasks table for user isolation
db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL DEFAULT 'demo',
        name TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        dueDate TEXT
    )
`).run();

// Add username column to groceries table for user isolation
db.prepare(`
    CREATE TABLE IF NOT EXISTS groceries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL DEFAULT 'demo',
        name TEXT NOT NULL,
        expanded INTEGER NOT NULL DEFAULT 0,
        UNIQUE(username, name)
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

// Create indexes for better query performance
db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tasks_username 
    ON tasks(username)
`).run();

db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_groceries_username 
    ON groceries(username)
`).run();

// Migration: Add username column to existing data if it doesn't exist
try {
  const tasksInfo = db.prepare("PRAGMA table_info(tasks)").all();
  const hasUsernameInTasks = tasksInfo.some(col => col.name === 'username');
  
  if (!hasUsernameInTasks) {
    console.log('📝 Migrating tasks table to add username column...');
    db.prepare(`ALTER TABLE tasks ADD COLUMN username TEXT NOT NULL DEFAULT 'demo'`).run();
  }
} catch (err) {
  console.log('Tasks table migration check:', err.message);
}

try {
  const groceriesInfo = db.prepare("PRAGMA table_info(groceries)").all();
  const hasUsernameInGroceries = groceriesInfo.some(col => col.name === 'username');
  
  if (!hasUsernameInGroceries) {
    console.log('📝 Migrating groceries table to add username column...');
    db.prepare(`ALTER TABLE groceries ADD COLUMN username TEXT NOT NULL DEFAULT 'demo'`).run();
    
    // Update unique constraint to include username
    console.log('📝 Updating groceries unique constraint...');
    db.prepare(`
      CREATE TABLE groceries_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL DEFAULT 'demo',
          name TEXT NOT NULL,
          expanded INTEGER NOT NULL DEFAULT 0,
          UNIQUE(username, name)
      )
    `).run();
    
    db.prepare(`
      INSERT INTO groceries_new (id, username, name, expanded)
      SELECT id, username, name, expanded FROM groceries
    `).run();
    
    db.prepare(`DROP TABLE groceries`).run();
    db.prepare(`ALTER TABLE groceries_new RENAME TO groceries`).run();
  }
} catch (err) {
  console.log('Groceries table migration check:', err.message);
}

console.log(`✅ Database initialized at ${dbPath}`);

// Verify tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(`📊 Database tables:`, tables.map(t => t.name).join(', '));

module.exports = db;