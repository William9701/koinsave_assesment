const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

// Test users
const sender = {
  email: 'sender@example.com',
  password: 'Test1234',
  full_name: 'Sender User'
};

const recipient = {
  email: 'recipient@example.com',
  password: 'Test1234',
  full_name: 'Recipient User'
};

let senderToken;
let recipientToken;
let senderId;
let recipientId;

// Setup test users
beforeAll(async () => {
  // Clean test data
  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM users WHERE email LIKE ?').run('%@example.com');

  // Register sender
  const senderResponse = await request(app)
    .post('/api/auth/register')
    .send(sender);
  senderToken = senderResponse.body.data.token;
  senderId = senderResponse.body.data.user.id;

  // Register recipient
  const recipientResponse = await request(app)
    .post('/api/auth/register')
    .send(recipient);
  recipientToken = recipientResponse.body.data.token;
  recipientId = recipientResponse.body.data.user.id;
});

afterAll(() => {
  // Clean test data
  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM users WHERE email LIKE ?').run('%@example.com');
  db.close();
});

describe('Transaction Endpoints', () => {
  describe('POST /api/transactions/transfer', () => {
    it('should transfer money successfully', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipient_email: recipient.email,
          amount: 100,
          description: 'Test transfer'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.amount).toBe(100);
      expect(response.body.data.new_balance).toBe(900); // 1000 - 100
    });

    it('should fail with insufficient balance', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipient_email: recipient.email,
          amount: 10000,
          description: 'Large transfer'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient balance');
    });

    it('should fail with non-existent recipient', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipient_email: 'nonexistent@example.com',
          amount: 50
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail with negative amount', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipient_email: recipient.email,
          amount: -50
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with zero amount', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipient_email: recipient.email,
          amount: 0
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .send({
          recipient_email: recipient.email,
          amount: 50
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/transactions/balance/current', () => {
    it('should get current balance', async () => {
      const response = await request(app)
        .get('/api/transactions/balance/current')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data.balance).toBe(900);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions/balance/current')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/transactions/history', () => {
    it('should get transaction history', async () => {
      const response = await request(app)
        .get('/api/transactions/history')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactions');
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.transactions.length).toBeGreaterThan(0);
    });

    it('should show correct transaction types', async () => {
      // Get sender's history
      const senderResponse = await request(app)
        .get('/api/transactions/history')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      const senderTxn = senderResponse.body.data.transactions[0];
      expect(senderTxn.type).toBe('debit');

      // Get recipient's history
      const recipientResponse = await request(app)
        .get('/api/transactions/history')
        .set('Authorization', `Bearer ${recipientToken}`)
        .expect(200);

      const recipientTxn = recipientResponse.body.data.transactions[0];
      expect(recipientTxn.type).toBe('credit');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions/history')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/transactions/stats/summary', () => {
    it('should get transaction statistics', async () => {
      const response = await request(app)
        .get('/api/transactions/stats/summary')
        .set('Authorization', `Bearer ${senderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toHaveProperty('total_transactions');
      expect(response.body.data.statistics).toHaveProperty('total_sent');
      expect(response.body.data.statistics).toHaveProperty('total_received');
      expect(response.body.data.statistics.total_sent).toBe(100);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions/stats/summary')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Concurrency and Double-Spending Prevention', () => {
    it('should handle concurrent transfers correctly', async () => {
      // Create a user with limited balance
      const testUser = {
        email: 'concurrent@example.com',
        password: 'Test1234',
        full_name: 'Concurrent Test'
      };

      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      const userToken = userResponse.body.data.token;

      // Try to make two transfers that together exceed balance
      const transfer1 = request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          recipient_email: recipient.email,
          amount: 600
        });

      const transfer2 = request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          recipient_email: recipient.email,
          amount: 600
        });

      const [result1, result2] = await Promise.all([transfer1, transfer2]);

      // One should succeed, one should fail
      const successes = [result1, result2].filter(r => r.status === 201);
      const failures = [result1, result2].filter(r => r.status === 400);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });
  });
});
