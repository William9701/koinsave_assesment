const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Transfer money to another user
 */
const transfer = async (req, res, next) => {
  try {
    const { recipient_email, amount, description } = req.body;
    const sender_id = req.user.id;

    // Find recipient by email
    const recipient = User.findByEmail(recipient_email);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Prevent self-transfer (additional check)
    if (sender_id === recipient.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer money to yourself'
      });
    }

    // Create transaction (includes overdraft and double-spending prevention)
    const transaction = Transaction.create({
      sender_id,
      recipient_id: recipient.id,
      amount: parseFloat(amount),
      description: description || `Transfer to ${recipient.full_name}`
    });

    // Get updated balances
    const updatedSender = User.findById(sender_id);

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          recipient: {
            name: transaction.recipient_name,
            email: transaction.recipient_email
          },
          description: transaction.description,
          status: transaction.status,
          created_at: transaction.created_at
        },
        new_balance: updatedSender.balance
      }
    });
  } catch (error) {
    // Handle specific transaction errors
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance for this transaction'
      });
    }

    if (error.message === 'Recipient not found') {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    next(error);
  }
};

/**
 * Get transaction history for current user
 */
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const transactions = User.getTransactionHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.transaction_type,
          amount: t.amount,
          other_party: t.other_party_name,
          description: t.description,
          status: t.status,
          created_at: t.created_at
        })),
        count: transactions.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single transaction details
 */
const getTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const transaction = Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Verify user is part of this transaction
    if (transaction.sender_id !== userId && transaction.recipient_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this transaction'
      });
    }

    // Determine transaction type for current user
    const transactionType = transaction.sender_id === userId ? 'debit' : 'credit';

    res.status(200).json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          type: transactionType,
          amount: transaction.amount,
          sender: {
            name: transaction.sender_name,
            email: transaction.sender_email
          },
          recipient: {
            name: transaction.recipient_name,
            email: transaction.recipient_email
          },
          description: transaction.description,
          status: transaction.status,
          created_at: transaction.created_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user balance
 */
const getBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const balance = User.getBalance(userId);

    if (balance === null) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        balance,
        currency: 'USD'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction statistics
 */
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = Transaction.getStats(userId);

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          total_transactions: stats.total_transactions || 0,
          total_sent: stats.total_sent || 0,
          total_received: stats.total_received || 0,
          net_flow: (stats.total_received || 0) - (stats.total_sent || 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  transfer,
  getHistory,
  getTransaction,
  getBalance,
  getStats
};
