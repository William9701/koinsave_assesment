const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

// Test users
const sender = {
  email: 'idempotent-sender@example.com',
  password: 'Test1234',
  full_name: 'Idempotent Sender'
};

const recipient = {
  email: 'idempotent-recipient@example.com',
  password: 'Test1234',
  full_name: 'Idempotent Recipient'
};

let senderToken;
let senderId;

// Setup test users
beforeAll(async () => {
  // Clean test data
  db.prepare('DELETE FROM idempotency_keys').run();
  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM users WHERE email LIKE ?').run('%idempotent%');

  // Register sender
  const senderResponse = await request(app)
    .post('/api/auth/register')
    .send(sender);
  senderToken = senderResponse.body.data.token;
  senderId = senderResponse.body.data.user.id;

  // Register recipient
  await request(app)
    .post('/api/auth/register')
    .send(recipient);
});

afterAll(() => {
  // Clean test data
  db.prepare('DELETE FROM idempotency_keys').run();
  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM users WHERE email LIKE ?').run('%idempotent%');
});

describe('Idempotency Tests', () => {
  describe('POST /api/transactions/transfer with Idempotency-Key', () => {
    it('should process first request successfully', async () => {
      const idempotencyKey = uuidv4();

      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          recipient_email: recipient.email,
          amount: 50,
          description: 'First idempotent transfer'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.amount).toBe(50);
      expect(response.body.data.new_balance).toBe(950);
    });

    it('should return cached response for duplicate request', async () => {
      const idempotencyKey = uuidv4();

      // First request
      const response1 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          recipient_email: recipient.email,
          amount: 100,
          description: 'Duplicate test'
        })
        .expect(201);

      const transactionId1 = response1.body.data.transaction.id;
      const balance1 = response1.body.data.new_balance;

      // Duplicate request with same idempotency key
      const response2 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          recipient_email: recipient.email,
          amount: 100,
          description: 'Duplicate test'
        })
        .expect(201);

      const transactionId2 = response2.body.data.transaction.id;
      const balance2 = response2.body.data.new_balance;

      // Should return same transaction
      expect(transactionId1).toBe(transactionId2);
      expect(balance1).toBe(balance2);

      // Verify balance was only deducted once
      const balanceCheck = await request(app)
        .get('/api/transactions/balance/current')
        .set('Authorization', `Bearer ${senderToken}`);

      // Balance should reflect only one deduction
      expect(balanceCheck.body.data.balance).toBe(balance1);
    });

    it('should reject same key with different parameters', async () => {
      const idempotencyKey = uuidv4();

      // First request
      await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          recipient_email: recipient.email,
          amount: 50,
          description: 'Original'
        })
        .expect(201);

      // Same key, different amount
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          recipient_email: recipient.email,
          amount: 75, // Different amount
          description: 'Original'
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('different request parameters');
    });

    it('should reject invalid idempotency key format', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', 'short') // Too short
        .send({
          recipient_email: recipient.email,
          amount: 50
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid idempotency key format');
    });

    it('should process request without idempotency key (backward compatibility)', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        // No idempotency key
        .send({
          recipient_email: recipient.email,
          amount: 25,
          description: 'No idempotency key'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow different keys for different requests', async () => {
      const key1 = uuidv4();
      const key2 = uuidv4();

      // First request with key1
      const response1 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', key1)
        .send({
          recipient_email: recipient.email,
          amount: 10,
          description: 'Transaction 1'
        })
        .expect(201);

      // Second request with key2 (different key)
      const response2 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', key2)
        .send({
          recipient_email: recipient.email,
          amount: 10,
          description: 'Transaction 2'
        })
        .expect(201);

      // Should create two different transactions
      expect(response1.body.data.transaction.id).not.toBe(response2.body.data.transaction.id);
    });

    it('should handle X-Idempotency-Key header variant', async () => {
      const idempotencyKey = uuidv4();

      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Idempotency-Key', idempotencyKey) // Alternative header name
        .send({
          recipient_email: recipient.email,
          amount: 15
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Retry with standard header name
      const response2 = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          recipient_email: recipient.email,
          amount: 15
        })
        .expect(201);

      // Should return cached response
      expect(response.body.data.transaction.id).toBe(response2.body.data.transaction.id);
    });
  });
});
