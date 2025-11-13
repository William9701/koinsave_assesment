const db = require('../config/database');

// Create idempotency table if it doesn't exist
const initIdempotencyTable = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      idempotency_key TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      request_path TEXT NOT NULL,
      request_body TEXT NOT NULL,
      response_code INTEGER,
      response_body TEXT,
      transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_idempotency_user ON idempotency_keys(user_id)
  `);

  // Also add idempotency_key column to transactions if it doesn't exist
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN idempotency_key TEXT`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key)`);
  } catch (error) {
    // Column might already exist, ignore error
  }
};

// Initialize on module load
initIdempotencyTable();

class Idempotency {
  /**
   * Store idempotency key with request details
   */
  static store({ idempotencyKey, userId, requestPath, requestBody, expiresInHours = 24 }) {
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      INSERT INTO idempotency_keys (idempotency_key, user_id, request_path, request_body, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(idempotencyKey, userId, requestPath, JSON.stringify(requestBody), expiresAt);
  }

  /**
   * Check if idempotency key exists
   */
  static find(idempotencyKey) {
    const stmt = db.prepare(`
      SELECT * FROM idempotency_keys
      WHERE idempotency_key = ?
      AND expires_at > datetime('now')
    `);

    return stmt.get(idempotencyKey);
  }

  /**
   * Update idempotency record with response
   */
  static update({ idempotencyKey, responseCode, responseBody, transactionId }) {
    const stmt = db.prepare(`
      UPDATE idempotency_keys
      SET response_code = ?, response_body = ?, transaction_id = ?
      WHERE idempotency_key = ?
    `);

    stmt.run(responseCode, JSON.stringify(responseBody), transactionId, idempotencyKey);
  }

  /**
   * Verify request matches stored request
   */
  static verifyMatch(stored, current) {
    const storedBody = JSON.parse(stored.request_body);

    // Compare essential fields
    return (
      stored.request_path === current.path &&
      JSON.stringify(storedBody) === JSON.stringify(current.body)
    );
  }

  /**
   * Clean up expired idempotency keys
   */
  static cleanup() {
    const stmt = db.prepare(`
      DELETE FROM idempotency_keys
      WHERE expires_at < datetime('now')
    `);

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Delete specific idempotency key (for testing)
   */
  static delete(idempotencyKey) {
    const stmt = db.prepare(`
      DELETE FROM idempotency_keys WHERE idempotency_key = ?
    `);

    stmt.run(idempotencyKey);
  }
}

module.exports = Idempotency;
