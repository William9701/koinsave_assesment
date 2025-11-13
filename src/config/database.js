const Database = require('better-sqlite3');
const path = require('path');

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Create tables
const initDatabase = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index on email for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id),
      CHECK (amount > 0),
      CHECK (status IN ('pending', 'completed', 'failed'))
    )
  `);

  // Create indexes for transaction queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)
  `);

  console.log('✅ Database initialized successfully');
};

// Initialize database on startup
initDatabase();

module.exports = db;
