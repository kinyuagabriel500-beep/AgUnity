# Unified Farm Intelligence Platform (UFIP)

UFIP is a modular, production-focused agritech platform designed to unify farm operations, intelligence, finance, and traceability in one ecosystem.

## Monorepo Structure

- `server/` - Node.js backend APIs
- `client/` - React web frontend
- `mobile/` - React Native mobile app
- `ai-service/` - Python FastAPI AI microservice
- `blockchain/` - Blockchain and Web3 integrations

## Step 1 Status

Initial project structure has been created with baseline environment configuration.

## Next Steps

Follow the phased build plan:
1. Backend APIs
2. Database schema
3. Profit engine
4. AI advisory services
5. Additional platform modules

## Render + Vercel Deployment

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for the free deployment path using Render for `server` and `ai-service`, Vercel for `client`, and Supabase for PostgreSQL.

If you want the older Railway-specific path, see [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md).

## Real Payments Upgrade (M-Pesa + Stripe)

UFIP now includes production-ready payment foundations:

1. Provider adapters for Stripe Checkout and M-Pesa STK Push.
2. Idempotent checkout creation using `Idempotency-Key`.
3. Verified webhook ingestion with deduplication.
4. Manual and admin reconciliation APIs for stale transactions.
5. Farmer dashboard checkout UI in the monetization panel.

### New Backend Endpoints

1. `POST /api/payments/checkout` (auth): Start Stripe or M-Pesa payment.
2. `GET /api/payments/:transactionId` (auth): Fetch transaction status.
3. `POST /api/payments/:transactionId/verify` (auth): Verify with provider API.
4. `POST /api/payments/webhooks/stripe` (public): Stripe webhook receiver.
5. `POST /api/payments/webhooks/mpesa` (public): M-Pesa callback receiver.
6. `POST /api/admin/payments/reconcile` (admin): Reconcile stale pending payments.
