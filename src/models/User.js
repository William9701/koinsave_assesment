const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  /**
   * Create a new user
   */
  static create({ email, password, full_name, initial_balance = 1000.0 }) {
    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, balance)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, email, password_hash, full_name, initial_balance);

    return this.findById(id);
  }

  /**
   * Find user by ID
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Find user by email
   */
  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  /**
   * Verify password
   */
  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  /**
   * Update user balance (with transaction safety)
   */
  static updateBalance(userId, newBalance, transaction = null) {
    const dbInstance = transaction || db;
    const stmt = dbInstance.prepare(`
      UPDATE users
      SET balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(newBalance, userId);
  }

  /**
   * Get user balance
   */
  static getBalance(userId) {
    const stmt = db.prepare('SELECT balance FROM users WHERE id = ?');
    const result = stmt.get(userId);
    return result ? result.balance : null;
  }

  /**
   * Get user's transaction history
   */
  static getTransactionHistory(userId, limit = 50) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        CASE
          WHEN t.sender_id = ? THEN 'debit'
          ELSE 'credit'
        END as transaction_type,
        CASE
          WHEN t.sender_id = ? THEN r.full_name
          ELSE s.full_name
        END as other_party_name
      FROM transactions t
      LEFT JOIN users s ON t.sender_id = s.id
      LEFT JOIN users r ON t.recipient_id = r.id
      WHERE t.sender_id = ? OR t.recipient_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `);

    return stmt.all(userId, userId, userId, userId, limit);
  }

  /**
   * Remove sensitive data from user object
   */
  static sanitize(user) {
    if (!user) return null;
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = User;
