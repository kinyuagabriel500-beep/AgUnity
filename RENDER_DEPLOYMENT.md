# AGUNITY on Render + Vercel + Supabase

This project can be deployed as three public services plus one managed database:

- `client` on Vercel
- `server` on Render
- `ai-service` on Render
- PostgreSQL on Supabase

## 1. Create the Database

1. Create a Supabase project.
2. Open Settings -> Database and copy the connection string.
3. Add `DATABASE_SSL=true` in the server environment variables.

### Optional starter tables

Use the SQL editor only if you want a minimal starter schema. The app also creates and syncs its own tables during startup.

## 2. Deploy the Backend on Render

Create a new Web Service from the GitHub repo.

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

Set these environment variables:

- `DATABASE_URL=<your Supabase connection string>`
- `DATABASE_SSL=true`
- `JWT_SECRET=<long-random-secret>`
- `AI_SERVICE_BASE_URL=https://<your-ai-service-domain>` or `AI_SERVICE_URL=https://<your-ai-service-domain>`
- `PUBLIC_API_BASE_URL=https://<your-server-domain>` or `PUBLIC_API_URL=https://<your-server-domain>`

Health check:

- `GET /health`

## 3. Deploy the AI Service on Render

Create another Web Service.

- Root Directory: `ai-service`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port 10000`

Optional environment variables:

- `OPENAI_API_KEY=...`
- `WEATHER_API_KEY=...`
- `ALERT_CRON=*/30 * * * *`

Health check:

- `GET /health`
- `GET /docs`

## 4. Deploy the Client on Vercel

Import the GitHub repo into Vercel.

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

Set one of these environment variables:

- `VITE_API_BASE_URL=https://<your-server-domain>/api`
- `VITE_API_URL=https://<your-server-domain>/api`

## 5. Common Fixes

- If the frontend cannot talk to the backend, check that the API URL includes `/api`.
- If Postgres rejects the connection, ensure `DATABASE_SSL=true` is set for Supabase.
- If the server cannot reach the AI service, verify the AI service URL is the public Render domain.
- If the first request is slow on free tiers, that is usually cold start behavior.
