# Koinsave Fintech API

A professional-grade RESTful API for a fintech application with user authentication, transaction management, and comprehensive security features.

## Features

### Core Functionality
- ✅ **User Authentication & Authorization**
  - JWT-based authentication
  - Secure password hashing with bcrypt
  - Input validation and sanitization

- ✅ **Transaction Management**
  - Mock money transfers between users
  - Overdraft prevention
  - Double-spending protection with database transactions
  - Transaction history and analytics

- ✅ **Security & Best Practices**
  - Rate limiting on all endpoints
  - Helmet.js for security headers
  - Request logging and monitoring
  - CORS enabled
  - Environment-based configuration

- ✅ **Production Ready**
  - Comprehensive error handling
  - Unit tests with Jest
  - Postman API documentation
  - Docker support
  - Render deployment configuration

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Joi
- **Security:** Helmet, bcryptjs, express-rate-limit
- **Testing:** Jest, Supertest
- **Logging:** Morgan

## Project Structure

```
koinsave_assesment/
├── src/
│   ├── config/
│   │   └── database.js          # Database setup and initialization
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   └── transactionController.js  # Transaction logic
│   ├── models/
│   │   ├── User.js              # User model
│   │   └── Transaction.js       # Transaction model
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication middleware
│   │   ├── validation.js        # Input validation schemas
│   │   ├── rateLimiter.js       # Rate limiting configuration
│   │   ├── errorHandler.js      # Global error handling
│   │   └── logger.js            # Request logging
│   ├── routes/
│   │   ├── authRoutes.js        # Authentication routes
│   │   └── transactionRoutes.js # Transaction routes
│   ├── utils/
│   │   └── jwt.js               # JWT utilities
│   ├── app.js                   # Express app configuration
│   └── server.js                # Server entry point
├── __tests__/
│   ├── auth.test.js             # Authentication tests
│   └── transactions.test.js     # Transaction tests
├── logs/                        # Application logs (auto-generated)
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment variables template
├── package.json
├── jest.config.js
├── postman_collection.json      # API documentation
├── Dockerfile                   # Docker configuration
├── render.yaml                  # Render deployment config
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd koinsave_assesment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update the values (especially `JWT_SECRET` for production):
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   DATABASE_PATH=./database.sqlite
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Verify the server is running**
   ```bash
   curl http://localhost:3000/health
   ```

## API Documentation

### Base URL
```
Local: http://localhost:3000
Production: https://your-app.onrender.com
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "balance": 1000.0,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Transaction Endpoints

#### Transfer Money
```http
POST /api/transactions/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient_email": "recipient@example.com",
  "amount": 100.50,
  "description": "Payment for services"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "transaction": {
      "id": "uuid",
      "amount": 100.5,
      "recipient": {
        "name": "Jane Smith",
        "email": "recipient@example.com"
      },
      "description": "Payment for services",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "new_balance": 899.5
  }
}
```

#### Get Balance
```http
GET /api/transactions/balance/current
Authorization: Bearer <token>
```

#### Get Transaction History
```http
GET /api/transactions/history?limit=50
Authorization: Bearer <token>
```

#### Get Transaction Details
```http
GET /api/transactions/:transactionId
Authorization: Bearer <token>
```

#### Get Statistics
```http
GET /api/transactions/stats/summary
Authorization: Bearer <token>
```

### Postman Collection

Import the `postman_collection.json` file into Postman for complete API documentation with examples and test scenarios.

1. Open Postman
2. Click "Import"
3. Select `postman_collection.json`
4. The collection includes:
   - All API endpoints
   - Auto-token management
   - Test scenarios
   - Example requests

## Security Features

### 1. Authentication
- JWT tokens with configurable expiration
- Secure password hashing with bcrypt (10 rounds)
- Token validation on protected routes

### 2. Input Validation
- Email format validation
- Password strength requirements (min 8 chars, uppercase, lowercase, number)
- Amount validation (positive, max limits)
- Sanitized error messages

### 3. Rate Limiting
- **General API:** 100 requests per 15 minutes
- **Authentication:** 5 attempts per 15 minutes
- **Transactions:** 10 transfers per minute

### 4. Transaction Safety
- **Overdraft Prevention:** Checks balance before transfer
- **Double-Spending Protection:** Database transactions with row-level locking
- **Atomic Operations:** All balance updates are atomic
- **Concurrency Handling:** Tested with concurrent transfers

### 5. Logging
- Request/response logging with Morgan
- Transaction audit trail
- Error tracking
- Configurable log levels

## Testing

### Run Unit Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Test Coverage
- Authentication flows
- Transaction operations
- Validation rules
- Error scenarios
- Concurrency and race conditions

## Deployment

### Deploying to Render

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect the `render.yaml` configuration
   - Click "Create Web Service"

3. **Environment Variables** (Set in Render Dashboard)
   - `JWT_SECRET` - Generate a secure random string
   - `NODE_ENV` - Set to `production`
   - Other variables are auto-configured via `render.yaml`

4. **Database Persistence**
   - SQLite database persists in the container
   - For production, consider upgrading to PostgreSQL

### Docker Deployment

```bash
# Build image
docker build -t koinsave-api .

# Run container
docker run -p 3000:3000 --env-file .env koinsave-api
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3000 | No |
| NODE_ENV | Environment | development | No |
| JWT_SECRET | JWT signing key | - | Yes |
| JWT_EXPIRES_IN | Token expiration | 24h | No |
| DATABASE_PATH | SQLite database path | ./database.sqlite | No |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 | No |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 | No |

## Fintech Best Practices Implemented

1. **Financial Accuracy**
   - Decimal precision handling
   - Atomic transactions
   - Balance reconciliation

2. **Audit Trail**
   - Complete transaction history
   - Timestamps on all operations
   - Immutable transaction records

3. **Security**
   - No sensitive data in logs
   - Encrypted passwords
   - Secure token management

4. **Compliance**
   - Input validation
   - Error handling
   - Rate limiting

5. **Monitoring**
   - Health check endpoint
   - Request logging
   - Transaction tracking

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Validation Error) |
| 401 | Unauthorized (Invalid/Missing Token) |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (Duplicate Email) |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |

## Development

### Project Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm test:watch     # Run tests in watch mode
```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  balance REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### Transactions Table
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'completed',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  CHECK (amount > 0)
)
```

## Troubleshooting

### Common Issues

1. **Database Locked Error**
   - SQLite uses WAL mode to reduce locks
   - Ensure only one process is accessing the database

2. **Port Already in Use**
   - Change PORT in `.env`
   - Or kill the process using port 3000

3. **JWT Token Invalid**
   - Ensure JWT_SECRET is consistent
   - Check token expiration

4. **Rate Limited**
   - Wait for the rate limit window to reset
   - Adjust limits in `.env` for development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

ISC

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: support@koinsave.com

---

**Built with ❤️ for Koinsave Assessment**
