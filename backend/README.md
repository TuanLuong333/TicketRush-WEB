# TicketRush Backend

Backend ExpressJS + MySQL cho TicketRush theo `ticket-rush-backend-db-plan.md`.

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run seed:admin
npm run dev
```

## Scripts

- `npm run dev`: chạy server bằng nodemon.
- `npm start`: chạy server Node.
- `npm run db:migrate`: tạo database/schema MySQL.
- `npm run seed:admin`: tạo admin từ biến `ADMIN_*` trong `.env`.

## API chính

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/events`
- `GET /api/events/:eventId`
- `GET /api/events/:eventId/seat-map`
- `POST /api/customer/events/:eventId/lock-seats`
- `GET /api/customer/orders`
- `GET /api/customer/orders/:orderId`
- `POST /api/customer/orders/:orderId/confirm-payment`
- `POST /api/admin/events`
- `PUT /api/admin/events/:eventId`
- `DELETE /api/admin/events/:eventId`
- `POST /api/admin/events/:eventId/publish`
- `POST /api/admin/events/:eventId/zones`
- `GET /api/admin/events/:eventId/zones`
- `POST /api/admin/events/:eventId/generate-seats`
- `GET /api/admin/events/:eventId/dashboard`
- `GET /api/admin/events/:eventId/audience-statistics`
- `POST /api/events/:eventId/queue/join`
- `GET /api/events/:eventId/queue/status`
- `POST /api/events/:eventId/queue/leave`
