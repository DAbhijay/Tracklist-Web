const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Make sure you have DATABASE_URL in your Railway Variables tab.');
  process.exit(1);
}

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
    console.log('✅ PostgreSQL connected successfully');
  }
});

// Initialize schema
const initSchema = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGINT PRIMARY KEY,
        username TEXT NOT NULL DEFAULT 'demo',
        name TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        "dueDate" TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS groceries (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL DEFAULT 'demo',
        name TEXT NOT NULL,
        expanded INTEGER NOT NULL DEFAULT 0,
        UNIQUE(username, name)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grocery_purchases (
        id SERIAL PRIMARY KEY,
        grocery_id INTEGER NOT NULL,
        purchased_at TEXT NOT NULL,
        FOREIGN KEY (grocery_id) REFERENCES groceries(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_username ON tasks(username)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_groceries_username ON groceries(username)
    `);

    console.log('✅ PostgreSQL schema initialized');

    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Database tables:', result.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('❌ Error initializing schema:', err);
  }
};

initSchema();

// ----- Database wrapper with consistent async API -----

const db = {
  // SELECT multiple rows
  allAsync: async (sql, params = []) => {
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

    const result = await pool.query(pgSql, params);
    return result.rows;
  },

  // SELECT single row
  getAsync: async (sql, params = []) => {
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

    const result = await pool.query(pgSql, params);
    return result.rows[0] || null;
  },

  // INSERT / UPDATE / DELETE
  runAsync: async (sql, params = []) => {
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

    // Add RETURNING id for INSERT statements
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

module.exports = db;