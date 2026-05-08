# TicketRush-WEB

Backend ExpressJS/MySQL nằm trong thư mục `backend/`.

## Chạy backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run seed:admin
npm run dev
```

API health check: `GET /health`.

