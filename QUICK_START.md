# Quick Start Guide

## Getting Started in 3 Simple Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Test the API

#### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123",
    "full_name": "John Doe"
  }'
```

You'll receive a response with a JWT token. Save this token!

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

#### Check Your Balance
```bash
curl http://localhost:3000/api/transactions/balance/current \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Register Another User to Transfer Money To
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "SecurePass456",
    "full_name": "Jane Smith"
  }'
```

#### Transfer Money
```bash
curl -X POST http://localhost:3000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "recipient_email": "jane@example.com",
    "amount": 100.50,
    "description": "Payment for services"
  }'
```

#### View Transaction History
```bash
curl http://localhost:3000/api/transactions/history \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Using Postman

For a better testing experience:

1. Import [postman_collection.json](postman_collection.json) into Postman
2. The collection automatically saves your auth token
3. All endpoints are pre-configured with examples

## Running Tests

```bash
npm test
```

## Development Mode

For auto-reload during development:

```bash
npm run dev
```

## Environment Configuration

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key variables:
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens (change in production!)
- `JWT_EXPIRES_IN` - Token expiration time (default: 24h)

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out the [Postman Collection](postman_collection.json)
- Deploy to Render (see deployment section in README)

## Common Issues

**Port already in use?**
```bash
# Change port in .env
PORT=3001 npm start
```

**Tests failing?**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm test
```

## Project Structure Quick Reference

```
src/
├── config/          # Database setup
├── controllers/     # Request handlers
├── models/          # Data models
├── middleware/      # Auth, validation, rate limiting
├── routes/          # API routes
└── utils/           # Helper functions
```

## API Endpoints Summary

**Authentication**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get profile (requires auth)

**Transactions**
- `POST /api/transactions/transfer` - Transfer money (requires auth)
- `GET /api/transactions/balance/current` - Get balance (requires auth)
- `GET /api/transactions/history` - Transaction history (requires auth)
- `GET /api/transactions/:id` - Get transaction details (requires auth)
- `GET /api/transactions/stats/summary` - Get statistics (requires auth)

**Health**
- `GET /health` - Server health check

---

**Need Help?** Check the detailed [README.md](README.md) or the Postman collection!
