const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

// Ensure db directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    console.log('Creating db directory...');
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create / open the database file
const dbPath = path.join(__dirname, "tracklist.db");
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Enable Foreign keys
db.pragma("foreign_keys = ON");

console.log('Initializing database schema...');

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

// Create index for better performance on purchases lookup
db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_grocery_purchases_grocery_id 
    ON grocery_purchases(grocery_id)
`).run();

console.log('Database schema initialized successfully');

// Log statistics
try {
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    const groceryCount = db.prepare('SELECT COUNT(*) as count FROM groceries').get();
    const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM grocery_purchases').get();
    
    console.log(`Database stats:`);
    console.log(`  - Tasks: ${taskCount.count}`);
    console.log(`  - Groceries: ${groceryCount.count}`);
    console.log(`  - Purchases: ${purchaseCount.count}`);
    console.log(`Database file size: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);
} catch (error) {
    console.error('Error reading database stats:', error);
}

module.exports = db;