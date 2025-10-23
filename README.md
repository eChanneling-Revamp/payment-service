# Payment Microservice

A simple and reliable payment processing service built with NestJS and integrated with PayHere payment gateway. This service works seamlessly with both web and mobile applications.

## What This Service Does

This microservice handles all payment-related operations for your application, including:
- Processing payments through PayHere
- Handling payment notifications
- Managing payment status updates
- Storing transaction records

## Prerequisites

Before you start, make sure you have:
- Node.js (version 16 or higher)
- npm or yarn package manager
- A PayHere merchant account ([Sign up here](https://www.payhere.lk/))
- Your PayHere Merchant ID and Secret Key

## Getting Started

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 2. Configuration

Create a `.env` file in the root directory with your PayHere credentials:

```env
PORT=3000
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
PAYHERE_MODE=sandbox  # Use 'live' for production
DATABASE_URL=your_database_connection_string
```

### 3. Running the Service

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

## Using the Service

### For Web Applications

Make a POST request to initiate a payment:

```javascript
fetch('http://localhost:3000/payments/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1000.00,
    currency: 'LKR',
    orderId: 'ORDER-123',
    itemName: 'Product Name',
    customerEmail: 'customer@example.com',
    customerPhone: '0771234567'
  })
})
```

The service will return a payment URL to redirect your customer to PayHere's payment page.

### For Mobile Applications

Use the same endpoint but handle the response according to your mobile framework:

**React Native Example:**
```javascript
const response = await fetch('http://localhost:3000/payments/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paymentData)
});

const { paymentUrl } = await response.json();
// Open payment URL in WebView or browser
```

**Flutter Example:**
```dart
final response = await http.post(
  Uri.parse('http://localhost:3000/payments/initiate'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode(paymentData),
);

final paymentUrl = jsonDecode(response.body)['paymentUrl'];
// Open payment URL in WebView
```

## API Endpoints

### Initiate Payment
- **URL:** `/payments/initiate`
- **Method:** POST
- **Purpose:** Start a new payment transaction

### Payment Notification
- **URL:** `/payments/notify`
- **Method:** POST
- **Purpose:** Receives payment status updates from PayHere (webhook)

### Check Payment Status
- **URL:** `/payments/status/:orderId`
- **Method:** GET
- **Purpose:** Check the current status of a payment

## Testing

Test the payment flow using PayHere sandbox mode:

1. Set `PAYHERE_MODE=sandbox` in your `.env` file
2. Use PayHere test card numbers for payments
3. Monitor the console logs for payment notifications

Run automated tests:

```bash
npm run test
```

## Important Notes

- Always use HTTPS in production to secure payment data
- Keep your PayHere secret key confidential
- Set up proper webhook URL in your PayHere merchant dashboard
- Handle failed payments gracefully in your application
- Test thoroughly in sandbox mode before going live

## Switching to Production

When you're ready to go live:

1. Change `PAYHERE_MODE=live` in your `.env` file
2. Update to your live PayHere credentials
3. Configure your production webhook URL in PayHere dashboard
4. Deploy the service to a secure server with HTTPS

## Support

- PayHere Documentation: [https://support.payhere.lk/](https://support.payhere.lk/)
- NestJS Documentation: [https://docs.nestjs.com/](https://docs.nestjs.com/)

## Troubleshooting

**Payment not completing?**
- Check if your webhook URL is properly configured in PayHere dashboard
- Verify your merchant credentials are correct
- Check server logs for error messages

**Can't connect to service?**
- Ensure the service is running on the correct port
- Check firewall settings
- Verify your `.env` file is properly configured

---

Built with ❤️ using NestJS and PayHere
