const path = require("path");
const fs = require("fs");

// Check if we should use PostgreSQL (production) or SQLite (local dev)
const DATABASE_URL = process.env.DATABASE_URL;
const usePostgres = !!DATABASE_URL;

let db;

if (usePostgres) {
  // ===== POSTGRESQL (Production on Render) =====
  const { Pool } = require('pg');
  
  console.log('🐘 Using PostgreSQL database');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  // Test connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ PostgreSQL connection error:', err);
    } else {
      console.log('✅ PostgreSQL connected');
    }
  });

  // Initialize PostgreSQL schema
  const initPostgresSchema = async () => {
    try {
      // Create tasks table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id BIGINT PRIMARY KEY,
          username TEXT NOT NULL DEFAULT 'demo',
          name TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          due_date TEXT
        )
      `);

      // Create groceries table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS groceries (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL DEFAULT 'demo',
          name TEXT NOT NULL,
          expanded INTEGER NOT NULL DEFAULT 0,
          UNIQUE(username, name)
        )
      `);

      // Create grocery_purchases table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS grocery_purchases (
          id SERIAL PRIMARY KEY,
          grocery_id INTEGER NOT NULL,
          purchased_at TEXT NOT NULL,
          FOREIGN KEY (grocery_id) REFERENCES groceries(id) ON DELETE CASCADE
        )
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_username 
        ON tasks(username)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_groceries_username 
        ON groceries(username)
      `);

      console.log('✅ PostgreSQL schema initialized');

      // Verify tables
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log('📊 Database tables:', result.rows.map(r => r.table_name).join(', '));
    } catch (err) {
      console.error('Error initializing PostgreSQL schema:', err);
    }
  };

  initPostgresSchema();

  // PostgreSQL wrapper with async API
  db = {
    allAsync: async (sql, params = []) => {
      // Convert SQLite placeholders (?) to PostgreSQL ($1, $2, etc.)
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
      
      // Handle SQLite's dueDate vs PostgreSQL's due_date
      pgSql = pgSql.replace(/dueDate/g, 'due_date');
      
      const result = await pool.query(pgSql, params);
      
      // Convert back: due_date -> dueDate for JavaScript
      return result.rows.map(row => {
        if (row.due_date !== undefined) {
          row.dueDate = row.due_date;
          delete row.due_date;
        }
        return row;
      });
    },
    
    getAsync: async (sql, params = []) => {
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
      pgSql = pgSql.replace(/dueDate/g, 'due_date');
      
      const result = await pool.query(pgSql, params);
      const row = result.rows[0] || null;
      
      if (row && row.due_date !== undefined) {
        row.dueDate = row.due_date;
        delete row.due_date;
      }
      
      return row;
    },
    
    runAsync: async (sql, params = []) => {
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
      pgSql = pgSql.replace(/dueDate/g, 'due_date');
      
      // For INSERT, add RETURNING id to get the inserted ID
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }
      
      const result = await pool.query(pgSql, params);
      
      return {
        lastID: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    },
    
    pool // Expose pool for advanced usage
  };

} else {
  // ===== SQLITE (Local Development) =====
  const Database = require("better-sqlite3");
  
  console.log('📁 Using SQLite database (local development)');
  
  const isProd = process.env.NODE_ENV === "production";
  const dbDir = isProd 
    ? "/opt/render/project/data"
    : path.join(__dirname);

  if (!fs.existsSync(dbDir)) {
    console.log(`Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "tracklist.db");
  console.log(`📁 Database location: ${dbPath}`);

  const sqliteDb = new Database(dbPath);

  sqliteDb.pragma("foreign_keys = ON");
  sqliteDb.pragma("journal_mode = WAL");

  // Initialize SQLite schema
  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL DEFAULT 'demo',
      name TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      dueDate TEXT
    )
  `).run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS groceries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL DEFAULT 'demo',
      name TEXT NOT NULL,
      expanded INTEGER NOT NULL DEFAULT 0,
      UNIQUE(username, name)
    )
  `).run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS grocery_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grocery_id INTEGER NOT NULL,
      purchased_at TEXT NOT NULL,
      FOREIGN KEY (grocery_id) REFERENCES groceries(id) ON DELETE CASCADE
    )
  `).run();

  sqliteDb.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tasks_username 
    ON tasks(username)
  `).run();

  sqliteDb.prepare(`
    CREATE INDEX IF NOT EXISTS idx_groceries_username 
    ON groceries(username)
  `).run();

  // Migration for existing data
  try {
    const tasksInfo = sqliteDb.prepare("PRAGMA table_info(tasks)").all();
    const hasUsernameInTasks = tasksInfo.some(col => col.name === 'username');
    
    if (!hasUsernameInTasks) {
      console.log('📝 Migrating tasks table to add username column...');
      sqliteDb.prepare(`ALTER TABLE tasks ADD COLUMN username TEXT NOT NULL DEFAULT 'demo'`).run();
    }
  } catch (err) {
    console.log('Tasks table migration check:', err.message);
  }

  try {
    const groceriesInfo = sqliteDb.prepare("PRAGMA table_info(groceries)").all();
    const hasUsernameInGroceries = groceriesInfo.some(col => col.name === 'username');
    
    if (!hasUsernameInGroceries) {
      console.log('📝 Migrating groceries table to add username column...');
      sqliteDb.prepare(`ALTER TABLE groceries ADD COLUMN username TEXT NOT NULL DEFAULT 'demo'`).run();
      
      console.log('📝 Updating groceries unique constraint...');
      sqliteDb.prepare(`
        CREATE TABLE groceries_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL DEFAULT 'demo',
          name TEXT NOT NULL,
          expanded INTEGER NOT NULL DEFAULT 0,
          UNIQUE(username, name)
        )
      `).run();
      
      sqliteDb.prepare(`
        INSERT INTO groceries_new (id, username, name, expanded)
        SELECT id, username, name, expanded FROM groceries
      `).run();
      
      sqliteDb.prepare(`DROP TABLE groceries`).run();
      sqliteDb.prepare(`ALTER TABLE groceries_new RENAME TO groceries`).run();
    }
  } catch (err) {
    console.log('Groceries table migration check:', err.message);
  }

  console.log(`✅ SQLite database initialized at ${dbPath}`);

  const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`📊 Database tables:`, tables.map(t => t.name).join(', '));

  // Wrap SQLite with async methods for consistency
  db = {
    ...sqliteDb,
    allAsync: (sql, params = []) => Promise.resolve(sqliteDb.prepare(sql).all(...params)),
    getAsync: (sql, params = []) => Promise.resolve(sqliteDb.prepare(sql).get(...params)),
    runAsync: (sql, params = []) => {
      const result = sqliteDb.prepare(sql).run(...params);
      return Promise.resolve({
        lastID: result.lastInsertRowid,
        changes: result.changes
      });
    }
  };
}

module.exports = db;