const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const User = require('./User');

class Transaction {
  /**
   * Create a new transaction with atomic balance updates
   * Prevents double spending and overdraft
   */
  static create({ sender_id, recipient_id, amount, description = '' }) {
    // Validate basic requirements
    if (sender_id === recipient_id) {
      throw new Error('Cannot transfer to yourself');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Use database transaction for atomicity
    const transaction = db.transaction(() => {
      // Get sender's balance (transactions in better-sqlite3 are atomic)
      const senderStmt = db.prepare('SELECT balance FROM users WHERE id = ?');
      const sender = senderStmt.get(sender_id);

      if (!sender) {
        throw new Error('Sender not found');
      }

      // Check for sufficient balance (overdraft prevention)
      if (sender.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Verify recipient exists
      const recipientStmt = db.prepare('SELECT id FROM users WHERE id = ?');
      const recipient = recipientStmt.get(recipient_id);

      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Create transaction record
      const transactionId = uuidv4();
      const insertStmt = db.prepare(`
        INSERT INTO transactions (id, sender_id, recipient_id, amount, status, description)
        VALUES (?, ?, ?, ?, 'completed', ?)
      `);

      insertStmt.run(transactionId, sender_id, recipient_id, amount, description);

      // Update sender's balance
      const newSenderBalance = sender.balance - amount;
      User.updateBalance(sender_id, newSenderBalance, db);

      // Update recipient's balance
      const recipientBalanceStmt = db.prepare('SELECT balance FROM users WHERE id = ?');
      const recipientBalance = recipientBalanceStmt.get(recipient_id).balance;
      const newRecipientBalance = recipientBalance + amount;
      User.updateBalance(recipient_id, newRecipientBalance, db);

      return transactionId;
    });

    // Execute the transaction
    const transactionId = transaction();

    return this.findById(transactionId);
  }

  /**
   * Find transaction by ID
   */
  static findById(id) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        s.full_name as sender_name,
        s.email as sender_email,
        r.full_name as recipient_name,
        r.email as recipient_email
      FROM transactions t
      JOIN users s ON t.sender_id = s.id
      JOIN users r ON t.recipient_id = r.id
      WHERE t.id = ?
    `);

    return stmt.get(id);
  }

  /**
   * Get all transactions with pagination
   */
  static findAll(limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        s.full_name as sender_name,
        r.full_name as recipient_name
      FROM transactions t
      JOIN users s ON t.sender_id = s.id
      JOIN users r ON t.recipient_id = r.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset);
  }

  /**
   * Get user's sent transactions
   */
  static findBySender(sender_id, limit = 50) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        r.full_name as recipient_name,
        r.email as recipient_email
      FROM transactions t
      JOIN users r ON t.recipient_id = r.id
      WHERE t.sender_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `);

    return stmt.all(sender_id, limit);
  }

  /**
   * Get user's received transactions
   */
  static findByRecipient(recipient_id, limit = 50) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        s.full_name as sender_name,
        s.email as sender_email
      FROM transactions t
      JOIN users s ON t.sender_id = s.id
      WHERE t.recipient_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `);

    return stmt.all(recipient_id, limit);
  }

  /**
   * Get transaction statistics for a user
   */
  static getStats(user_id) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN sender_id = ? THEN amount ELSE 0 END) as total_sent,
        SUM(CASE WHEN recipient_id = ? THEN amount ELSE 0 END) as total_received
      FROM transactions
      WHERE sender_id = ? OR recipient_id = ?
    `);

    return stmt.get(user_id, user_id, user_id, user_id);
  }
}

module.exports = Transaction;
