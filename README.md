# Payments + Notifications Service (Node.js / Express)

A minimal Express skeleton for payments and notifications with env-driven configs, structured logging, and unit tests. Paytm and SMS integrations are mocked for development and tests.

## Features

- /health endpoint
- Env-driven config via `.env` (see `.env.example`)
- Structured logging with pino and request-scoped IDs
- Mocked Paytm + SMS integrations
- Payment service functions:
  - createPayment()
  - verifyPaytmSignature()
  - handlePaymentWebhook()
  - updatePaymentStatus()
  - sendSMSNotification()
  - getPaymentById()
- Unit tests with Jest + Supertest

## Setup

1. Copy `.env.example` to `.env` and adjust if needed.
2. Install dependencies:

```bash
npm install
```

3. Run tests:

```bash
npm test
```

4. Start the server:

```bash
npm start
```

Server listens on `PORT` (default 3000). Health check: `GET /health`.

## Endpoints

- GET `/health` – service health.
- POST `/api/payments` – create a payment. Body:
  - amount (number)
  - currency (string, default: INR)
  - customerId (string)
  - phone (string)
- GET `/api/payments/:id` – fetch a payment by ID.
- PATCH `/api/payments/:id` – update payment status. Body: `{ status: 'SUCCESS'|'FAILED'|'PENDING' }`.
- POST `/api/payments/webhook` – Paytm webhook (mock). Body:
  - orderId (string)
  - status (string)
  - amount (number)
  - checksum (string) – HMAC SHA256 of `{orderId,status,amount}` with `PAYTM_MERCHANT_KEY`.

## Notes

- All third-party calls are mocked. No external requests are made.
- Logs are structured JSON. In tests, logging is silenced by default.
