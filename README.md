# Payment Microservice

A reliable payment processing service built with NestJS and integrated with PayHere payment gateway. This service handles payment initiation, status tracking, and webhook processing.

## Prerequisites

Before you start, make sure you have:
- Node.js (version 16 or higher)
- npm or yarn package manager
- A PayHere merchant account ([Sign up here](https://www.payhere.lk/))
- PostgreSQL database (or NeonDB)

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure your `.env` file with the following variables:

   ```env
   # Application Configuration
   NODE_ENV=development
   PORT=3000
   API_PREFIX=api/v1

   # Database Configuration
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   
   # Database Pool Settings
   DB_POOL_MIN=2
   DB_POOL_MAX=10
   DB_CONNECTION_TIMEOUT=20000
   DB_IDLE_TIMEOUT=30000

   # PayHere Configuration
   PAYHERE_MERCHANT_ID=your_merchant_id
   PAYHERE_MERCHANT_SECRET=your_merchant_secret
   PAYHERE_MODE=sandbox  # Use 'live' for production
   PAYHERE_API_URL=https://sandbox.payhere.lk/pay/checkout

   # Security & Rate Limiting
   CORS_ORIGIN=http://localhost:3000,http://localhost:3001
   RATE_LIMIT_TTL=60
   RATE_LIMIT_MAX=100

   # Logging
   LOG_LEVEL=debug
   LOG_FORMAT=json

   # Health Check
   HEALTH_CHECK_ENABLED=true
   HEALTH_CHECK_DATABASE_ENABLED=true

   # Webhook Configuration
   WEBHOOK_TIMEOUT=30000
   WEBHOOK_RETRY_ATTEMPTS=3
   WEBHOOK_RETRY_DELAY=1000
   ```

## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup the database (Generate client, migrate, and seed):
   ```bash
   npm run db:setup
   ```

## Running the Service

Start the development server:
```bash
npm run start:dev
```

The service will be available at `http://localhost:3000`

For production:
```bash
npm run build
npm run start:prod
```

## API Endpoints

### Payments

#### Create Payment
- **URL:** `/payments`
- **Method:** `POST`
- **Summary:** Create a new payment
- **Headers:** 
  - `idempotency-key` (optional): Unique key to prevent duplicate payments
- **Body:**
  ```json
  {
    "bookingId": "BOOKING-001",
    "amount": 1500.00,
    "currency": "LKR",
    "userId": "user-123",
    "userEmail": "user@example.com",
    "userPhone": "0771234567"
  }
  ```

#### Get Payment
- **URL:** `/payments/:id`
- **Method:** `GET`
- **Summary:** Get payment details by UUID

### Webhooks

#### PayHere Webhook
- **URL:** `/webhooks/payhere`
- **Method:** `POST`
- **Summary:** Receives payment notifications from PayHere
- **Headers:**
  - `x-payhere-signature`: HMAC-SHA256 signature for verification

#### Test Webhook (Development Only)
- **URL:** `/webhooks/payhere/test`
- **Method:** `POST`
- **Summary:** Test endpoint that bypasses signature verification

## Usage Examples

### Initiating a Payment (Frontend)

```javascript
const response = await fetch('http://localhost:3000/payments', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'idempotency-key': 'unique-request-id' 
  },
  body: JSON.stringify({
    bookingId: 'BOOKING-123',
    amount: 1000.00,
    currency: 'LKR',
    userId: 'user-123',
    userEmail: 'customer@example.com',
    userPhone: '0771234567'
  })
});

const data = await response.json();
// Use data to redirect to PayHere
```

## Testing

Run unit tests:
```bash
npm run test
```

Run e2e tests:
```bash
npm run test:e2e
```

## Support

- PayHere Documentation: [https://support.payhere.lk/](https://support.payhere.lk/)
- NestJS Documentation: [https://docs.nestjs.com/](https://docs.nestjs.com/)
