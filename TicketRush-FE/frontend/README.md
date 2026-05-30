# TicketRush FrontEnd

## Chay frontend

```bash
npm install
npm run dev
```

Mac dinh frontend goi backend qua proxy trong `vite.config.ts`.
Neu backend chay cong khac, dat bien:

```bash
VITE_API_PROXY_TARGET=http://localhost:4000 npm run dev
```

## Tai khoan admin

Khi backend da chay seed admin:

- Email: `admin@ticketrush.local`
- Mat khau: `Admin@123456`

Khi frontend dang fallback mock data:

- Email: `admin@ticketrush.vn`
- Mat khau goi y: `Admin@2026`

Luu y: moi truong mock frontend chi dung de test giao dien. Backend seed doc tai khoan admin tu cac bien `ADMIN_EMAIL` va `ADMIN_PASSWORD` trong backend `.env`.

## Kiem thu nhanh local DB

```bash
npm run test:local-db
```
