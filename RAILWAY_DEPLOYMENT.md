# UFIP on Railway

This project can be deployed to Railway as **3 services + 1 database**:

- `server` (Node.js API)
- `ai-service` (FastAPI)
- `client` (Vite static app served by Nginx)
- Railway PostgreSQL plugin

## 1. Create Railway Project

1. Create a new Railway project.
2. Add PostgreSQL plugin.
3. Add 3 services from this repo:
   - Service A root: `server/`
   - Service B root: `ai-service/`
   - Service C root: `client/`

Each service already has a Dockerfile.

## 2. Configure Service Variables

## `server` service variables

Required:

- `NODE_ENV=production`
- `JWT_SECRET=<long-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `DATABASE_URL=<Railway PostgreSQL connection URL>`
- `AI_SERVICE_BASE_URL=https://<your-ai-service-domain>`
- `PUBLIC_API_BASE_URL=https://<your-server-domain>`

Optional:

- `GEMINI_API_KEY=...`
- `GEMINI_MODEL=gemini-1.5-flash`
- `WEATHER_API_KEY=...`
- `POLYGON_RPC_URL=...`
- `POLYGON_PRIVATE_KEY=...`
- `IPFS_GATEWAY_URL=...`
- `IPFS_API_URL=...`
- `IPFS_API_TOKEN=...`
- `PAYMENT_DEFAULT_CURRENCY=KES`
- `PUBLIC_WEBHOOK_BASE_URL=https://<your-server-domain>`
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `STRIPE_SUCCESS_URL=https://<your-client-domain>/farmer`
- `STRIPE_CANCEL_URL=https://<your-client-domain>/farmer`
- `MPESA_ENV=sandbox` (or `live`)
- `MPESA_CONSUMER_KEY=...`
- `MPESA_CONSUMER_SECRET=...`
- `MPESA_SHORTCODE=...`
- `MPESA_PASSKEY=...`
- `MPESA_CALLBACK_URL=https://<your-server-domain>/api/payments/webhooks/mpesa`

Notes:

- The server now honors Railway `PORT` automatically.
- `server` exposes health at `/health`.
- Stripe webhook endpoint: `POST /api/payments/webhooks/stripe`.
- M-Pesa callback endpoint: `POST /api/payments/webhooks/mpesa`.

## `ai-service` service variables

Recommended:

- `OPENAI_API_KEY=...` (if used)
- `WEATHER_API_KEY=...`
- `ALERT_CRON=*/30 * * * *`

Notes:

- AI service Docker now honors Railway `PORT` automatically.
- Health endpoint: `/health`.

## `client` service variables

Required at build time:

- `VITE_API_BASE_URL=https://<your-server-domain>/api`

Notes:

- After changing `VITE_API_BASE_URL`, redeploy `client`.
- The frontend calls backend through this variable.

## 3. Domain Wiring

1. Ensure `ai-service` is deployed and has a public Railway domain.
2. Set `AI_SERVICE_BASE_URL` in `server` to that domain.
3. Deploy `server` and confirm:
   - `GET https://<server-domain>/health` returns ok.
4. Set `VITE_API_BASE_URL` in `client` to `https://<server-domain>/api`.
5. Deploy `client` and open the app domain.

## 4. Smoke Tests

- Client: app loads and login works.
- Server: `GET /health` -> `{"status":"ok","service":"ufip-server"}`
- AI: `GET /health` -> `{"status":"ok","service":"ufip-ai-service"}`
- Role routing:
  - Non-admin users are redirected to their own dashboard when trying other routes.
  - Admin can access all dashboards.

## 5. Common Issues

- Client cannot call backend:
  - Verify `VITE_API_BASE_URL` includes `/api`.
  - Redeploy client after changing env.
- Server cannot call AI service:
  - Verify `AI_SERVICE_BASE_URL` is the public AI domain.
- DB connection errors:
  - Check `DATABASE_URL` is from Railway PostgreSQL plugin and includes SSL if required.
