# TicketRush Backend

Backend Node.js/Express.js cho hệ thống bán vé sự kiện TicketRush. Dự án xử lý đăng ký/đăng nhập, quản lý sự kiện, khu ghế, sơ đồ ghế, giữ ghế, đơn hàng, xác nhận thanh toán nội bộ, hàng chờ mua vé và trang quản trị.

Tài liệu này được viết dựa trên source code hiện tại. Những phần không thấy trong source sẽ được ghi rõ là "Chưa xác định từ source code hiện tại".

## 1. Công nghệ sử dụng

- Runtime: Node.js >= 18.
- Framework web: Express.js.
- Database: MySQL.
- ORM/ODM: Không sử dụng ORM/ODM. Dự án query SQL trực tiếp bằng `mysql2/promise`.
- Authentication: JWT bằng package `jsonwebtoken`.
- Mã hóa mật khẩu: `bcrypt`.
- Middleware chính:
  - `helmet`: tăng bảo mật HTTP headers.
  - `cors`: cấu hình CORS.
  - `morgan`: log request.
  - `express.json`: parse JSON body.
  - `multer`: upload ảnh sự kiện.
- Cron job: `node-cron`.
- Config môi trường: `dotenv`.

Package chính nằm trong `package.json`:

| Package | Vai trò |
|---|---|
| `express` | Tạo HTTP API server |
| `mysql2` | Kết nối và query MySQL |
| `jsonwebtoken` | Tạo và xác thực JWT |
| `bcrypt` | Hash và kiểm tra mật khẩu |
| `dotenv` | Đọc biến môi trường từ `.env` |
| `cors` | Cho phép frontend gọi API |
| `helmet` | Thiết lập security headers |
| `morgan` | Log request |
| `multer` | Upload ảnh |
| `node-cron` | Chạy job định kỳ |
| `nodemon` | Chạy dev server tự reload |

## 2. Cấu trúc thư mục

```text
backend/
├── package.json
├── package-lock.json
├── README.md
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    ├── jobs/
    ├── migrations/
    ├── modules/
    ├── seed/
    └── utils/
```

| Đường dẫn | Vai trò |
|---|---|
| `src/app.js` | Tạo Express app, cấu hình middleware global, static uploads, health check và mount routes |
| `src/server.js` | Kết nối database, start server, start cron jobs |
| `src/config/env.js` | Đọc và chuẩn hóa biến môi trường |
| `src/config/database.js` | Tạo MySQL connection pool |
| `src/migrations/*.sql` | Định nghĩa schema database |
| `src/migrations/run-migrations.js` | Tạo database, chạy migration theo thứ tự và lưu lịch sử vào `schema_migrations` |
| `src/seed/admin.seed.js` | Tạo tài khoản admin từ biến `ADMIN_*` |
| `src/jobs/releaseExpiredSeats.job.js` | Mỗi phút giải phóng ghế đang giữ đã hết hạn |
| `src/jobs/activateQueue.job.js` | Mỗi phút kích hoạt người dùng trong hàng chờ nếu queue được bật |
| `src/utils/errors.js` | `AppError`, `asyncHandler`, middleware 404 và error handler |
| `src/utils/ids.js` | Validate/chuyển đổi id số nguyên dương |
| `src/utils/generateCode.js` | Sinh mã đơn hàng và queue token |
| `src/modules/auth` | Đăng ký, đăng nhập, JWT middleware |
| `src/modules/events` | API public xem sự kiện và sơ đồ ghế |
| `src/modules/seats` | Customer giữ ghế |
| `src/modules/orders` | Customer xem đơn, hủy giữ ghế, xác nhận thanh toán |
| `src/modules/queue` | Hàng chờ mua vé |
| `src/modules/admin` | Admin quản lý event, zone, ghế, đơn hàng, thống kê, upload ảnh |

## 3. Luồng hoạt động tổng quát

1. Client gọi API vào Express app trong `src/app.js`.
2. Middleware global chạy trước: `helmet`, `cors`, `express.json`, `morgan`, static `/uploads`.
3. Request được chuyển vào route tương ứng:
   - `/api/auth`
   - `/api/events`
   - `/api/customer/events`
   - `/api/customer/orders`
   - `/api/admin`
4. Route gọi controller, controller gọi service.
5. Service xử lý nghiệp vụ và query MySQL qua connection pool trong `src/config/database.js`.
6. Nếu có lỗi nghiệp vụ, service throw `AppError`.
7. `asyncHandler` chuyển lỗi về `errorHandler`.
8. `errorHandler` trả JSON lỗi cho client.

Luồng mua vé cơ bản:

1. Customer đăng ký hoặc đăng nhập để nhận JWT.
2. Customer xem danh sách sự kiện public.
3. Customer xem sơ đồ ghế của sự kiện.
4. Nếu queue được bật, customer phải vào hàng chờ và có trạng thái `ACTIVE`.
5. Customer giữ ghế bằng `POST /api/customer/events/:eventId/lock-seats`.
6. Backend tạo order trạng thái `PENDING`, đổi ghế sang `LOCKED`, đặt thời gian hết hạn.
7. Customer xác nhận thanh toán bằng `POST /api/customer/orders/:orderId/confirm-payment`.
8. Backend đổi order sang `PAID`, đổi ghế sang `SOLD`.

## 4. Cấu hình môi trường `.env`

Dự án dùng `dotenv`, nhưng trong source hiện tại không thấy file `.env.example`.

Tạo file `.env` ở thư mục root `backend/`:

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=*

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ticket_rush
DB_CONNECTION_LIMIT=10

JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d

LOCK_DURATION_MINUTES=10

QUEUE_ENABLED=false
QUEUE_ACTIVE_BATCH_SIZE=50
QUEUE_ACTIVE_MINUTES=10

ADMIN_FULL_NAME=TicketRush Admin
ADMIN_EMAIL=admin@ticketrush.local
ADMIN_PASSWORD=Admin@123456
```

| Biến | Ý nghĩa | Mặc định trong code |
|---|---|---|
| `NODE_ENV` | Môi trường chạy app | `development` |
| `PORT` | Port HTTP server | `4000` |
| `CORS_ORIGIN` | Origin frontend được phép gọi API | `*` |
| `DB_HOST` | Host MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USER` | User MySQL | `root` |
| `DB_PASSWORD` | Password MySQL | rỗng |
| `DB_NAME` | Tên database | `ticket_rush` |
| `DB_CONNECTION_LIMIT` | Số connection tối đa trong pool | `10` |
| `JWT_SECRET` | Secret ký JWT | `change-this-secret` |
| `JWT_EXPIRES_IN` | Thời hạn JWT | `7d` |
| `LOCK_DURATION_MINUTES` | Thời gian giữ ghế | `10` |
| `QUEUE_ENABLED` | Bật/tắt hàng chờ | `false` |
| `QUEUE_ACTIVE_BATCH_SIZE` | Số người được active mỗi lượt | `50` |
| `QUEUE_ACTIVE_MINUTES` | Thời gian active trong queue | `10` |
| `ADMIN_FULL_NAME` | Tên admin seed | `TicketRush Admin` |
| `ADMIN_EMAIL` | Email admin seed | `admin@ticketrush.local` |
| `ADMIN_PASSWORD` | Mật khẩu admin seed | `Admin@123456` |

Lưu ý: nên đổi `JWT_SECRET` và `ADMIN_PASSWORD` khi chạy thật.

## 5. Cài đặt và chạy project

Yêu cầu:

- Node.js >= 18.
- MySQL đang chạy.
- User MySQL có quyền tạo database/table.

Cài dependencies:

```bash
npm install
```

Chạy migration:

```bash
npm run db:migrate
```

Tạo admin:

```bash
npm run seed:admin
```

Chạy dev server bằng nodemon:

```bash
npm run dev
```

Chạy production-style bằng Node:

```bash
npm start
```

Kiểm tra server:

```bash
GET http://localhost:4000/health
```

Response mong đợi:

```json
{
  "status": "ok"
}
```

## 6. API routes

Base URL mặc định:

```text
http://localhost:4000
```

### Health

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| GET | `/health` | Kiểm tra server còn sống | Không | Định nghĩa trực tiếp trong `src/app.js` |

### Auth/User

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| POST | `/api/auth/register` | Đăng ký customer mới, trả JWT và thông tin user | Không | `auth.controller.register` -> `auth.service.register` |
| POST | `/api/auth/login` | Đăng nhập bằng email/password, trả JWT và thông tin user | Không | `auth.controller.login` -> `auth.service.login` |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại từ token | Có | `authenticate` -> `auth.controller.me` |

Body đăng ký hỗ trợ các field:

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "12345678",
  "gender": "MALE",
  "dateOfBirth": "2000-01-01",
  "phone": "0900000000"
}
```

### Public Events

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| GET | `/api/events` | Lấy danh sách sự kiện, mặc định status `PUBLISHED` | Không | `event.controller.listEvents` -> `event.service.listEvents` |
| GET | `/api/events/:eventId` | Lấy chi tiết sự kiện, zone và thống kê ghế | Không | `event.controller.getEvent` -> `event.service.getEventById` |
| GET | `/api/events/:eventId/seat-map` | Lấy sơ đồ ghế theo zone/row/seat | Không | `event.controller.getSeatMap` -> `event.service.getSeatMap` |

Query của `GET /api/events`:

| Query | Ý nghĩa |
|---|---|
| `keyword` | Tìm theo title hoặc location |
| `status` | Lọc status: `DRAFT`, `PUBLISHED`, `CANCELLED`, `FINISHED` |
| `limit` | Số item mỗi trang, tối đa 100 |
| `page` | Trang hiện tại |

### Queue

Các route queue được mount dưới `/api/events/:eventId/queue`.

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| POST | `/api/events/:eventId/queue/join` | Customer vào hàng chờ của sự kiện | Có, role `CUSTOMER` | `queue.controller.joinQueue` -> `queue.service.joinQueue` |
| GET | `/api/events/:eventId/queue/status` | Xem trạng thái hàng chờ của customer | Có, role `CUSTOMER` | `queue.controller.getQueueStatus` -> `queue.service.getQueueStatus` |
| POST | `/api/events/:eventId/queue/leave` | Rời hàng chờ, đổi trạng thái thành `DONE` | Có, role `CUSTOMER` | `queue.controller.leaveQueue` -> `queue.service.leaveQueue` |

Nếu `QUEUE_ENABLED=false`, middleware giữ ghế sẽ bỏ qua yêu cầu hàng chờ. Nếu `QUEUE_ENABLED=true`, customer phải có queue entry trạng thái `ACTIVE` mới được giữ ghế.

### Customer Seats

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| POST | `/api/customer/events/:eventId/lock-seats` | Giữ danh sách ghế và tạo order `PENDING` | Có, role `CUSTOMER`; cần queue `ACTIVE` nếu queue bật | `seat.controller.lockSeats` -> `seat.service.lockSeats` |

Body:

```json
{
  "seatIds": [1, 2, 3]
}
```

Ràng buộc chính:

- Tối đa 20 ghế mỗi lần giữ.
- Sự kiện phải `PUBLISHED`.
- Phải nằm trong thời gian mở bán nếu event có `sale_start_time`/`sale_end_time`.
- Ghế phải `AVAILABLE` hoặc lock cũ đã hết hạn.

### Customer Orders/Payment

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| GET | `/api/customer/orders` | Lấy danh sách order của customer hiện tại | Có, role `CUSTOMER` | `order.controller.listOrders` -> `order.service.listOrders` |
| GET | `/api/customer/orders/:orderId` | Lấy chi tiết order và các ghế trong order | Có, role `CUSTOMER` | `order.controller.getOrder` -> `order.service.getOrder` |
| POST | `/api/customer/orders/:orderId/cancel-hold` | Hủy giữ ghế, trả ghế về `AVAILABLE`, order thành `CANCELLED` | Có, role `CUSTOMER` | `order.controller.cancelHold` -> `order.service.cancelHold` |
| POST | `/api/customer/orders/:orderId/confirm-payment` | Xác nhận thanh toán nội bộ, đổi order thành `PAID`, ghế thành `SOLD` | Có, role `CUSTOMER` | `order.controller.confirmPayment` -> `order.service.confirmPayment` |

Payment:

- Source code hiện tại chưa tích hợp cổng thanh toán bên ngoài.
- Endpoint `confirm-payment` chỉ xác nhận thanh toán ở backend nếu order còn `PENDING`, chưa hết hạn và ghế vẫn được user đó giữ.

### Admin Orders

Tất cả route admin cần JWT và role `ADMIN`.

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| GET | `/api/admin/orders` | Admin xem danh sách order, có filter/pagination | Có, role `ADMIN` | `admin.controller.listOrders` -> `admin.service.listOrders` |
| GET | `/api/admin/orders/:orderId` | Admin xem chi tiết order | Có, role `ADMIN` | `admin.controller.getOrder` -> `admin.service.getOrder` |

Query của `GET /api/admin/orders`:

| Query | Ý nghĩa |
|---|---|
| `page` | Trang hiện tại |
| `limit` | Số item mỗi trang, tối đa 100 |
| `eventId` | Lọc theo sự kiện |
| `userId` | Lọc theo user |
| `status` | `PENDING`, `PAID`, `CANCELLED`, `EXPIRED` |
| `search` | Tìm theo order code, tên/email/phone user hoặc title event |

### Admin Events

Tất cả route admin cần JWT và role `ADMIN`.

| Method | Endpoint | Chức năng | Token | Controller/service |
|---|---|---|---|---|
| POST | `/api/admin/events` | Tạo sự kiện mới | Có, role `ADMIN` | `uploadEventImages` -> `admin.controller.createEvent` -> `admin.service.createEvent` |
| PUT | `/api/admin/events/:eventId` | Cập nhật sự kiện | Có, role `ADMIN` | `uploadEventImages` -> `admin.controller.updateEvent` -> `admin.service.updateEvent` |
| DELETE | `/api/admin/events/:eventId` | Xóa sự kiện nếu chưa có order | Có, role `ADMIN` | `admin.controller.deleteEvent` -> `admin.service.deleteEvent` |
| POST | `/api/admin/events/:eventId/publish` | Chuyển event sang `PUBLISHED` | Có, role `ADMIN` | `admin.controller.publishEvent` -> `admin.service.publishEvent` |
| POST | `/api/admin/events/:eventId/zones` | Tạo khu ghế cho event | Có, role `ADMIN` | `admin.controller.createZone` -> `admin.service.createZone` |
| GET | `/api/admin/events/:eventId/zones` | Lấy danh sách khu ghế của event | Có, role `ADMIN` | `admin.controller.listZones` -> `admin.service.listZones` |
| POST | `/api/admin/events/:eventId/generate-seats` | Sinh ghế từ các zone đã tạo | Có, role `ADMIN` | `admin.controller.generateSeats` -> `admin.service.generateSeats` |
| GET | `/api/admin/events/:eventId/dashboard` | Xem doanh thu và thống kê ghế của event | Có, role `ADMIN` | `admin.controller.getDashboard` -> `admin.service.getDashboard` |
| GET | `/api/admin/events/:eventId/audience-statistics` | Thống kê khách đã mua theo giới tính và nhóm tuổi | Có, role `ADMIN` | `admin.controller.getAudienceStatistics` -> `admin.service.getAudienceStatistics` |

Tạo/cập nhật event có thể gửi `multipart/form-data` với file:

| Field | Ý nghĩa |
|---|---|
| `banner` | Ảnh banner sự kiện |
| `seatingChart` | Ảnh sơ đồ ghế |
| `seating_chart` | Tên field thay thế cho `seatingChart` |

Các field event thường dùng:

```json
{
  "title": "Concert A",
  "description": "Mo ta",
  "location": "Ho Chi Minh",
  "startTime": "2026-06-01T20:00:00.000Z",
  "endTime": "2026-06-01T22:00:00.000Z",
  "saleStartTime": "2026-05-01T00:00:00.000Z",
  "saleEndTime": "2026-06-01T19:00:00.000Z",
  "status": "DRAFT"
}
```

Tạo zone:

```json
{
  "name": "VIP",
  "rowCount": 5,
  "seatsPerRow": 20,
  "price": 1000000,
  "color": "#ffcc00"
}
```

## 7. Database schema chính

Dự án không có model class theo kiểu ORM. "Model/schema" chính là các bảng MySQL trong `src/migrations`.

### `users`

Lưu tài khoản customer/admin.

| Cột chính | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `full_name` | Họ tên |
| `email` | Email duy nhất |
| `password_hash` | Mật khẩu đã hash |
| `role` | `CUSTOMER` hoặc `ADMIN` |
| `gender` | `MALE`, `FEMALE`, `OTHER` hoặc null |
| `date_of_birth` | Ngày sinh |
| `phone` | Số điện thoại |

### `events`

Lưu thông tin sự kiện.

| Cột chính | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `title`, `description`, `location` | Thông tin sự kiện |
| `start_time`, `end_time` | Thời gian diễn ra |
| `sale_start_time`, `sale_end_time` | Thời gian mở bán |
| `status` | `DRAFT`, `PUBLISHED`, `CANCELLED`, `FINISHED` |
| `banner_url` | URL ảnh banner |
| `seating_chart` | URL ảnh sơ đồ ghế |
| `created_by` | Admin tạo event |

### `seat_zones`

Lưu khu ghế của một event.

| Cột chính | Ý nghĩa |
|---|---|
| `event_id` | Event chứa khu ghế |
| `name` | Tên khu, unique trong event |
| `row_count` | Số hàng |
| `seats_per_row` | Số ghế mỗi hàng |
| `price` | Giá ghế của khu |
| `color` | Màu hiển thị khu ghế |

### `seats`

Lưu từng ghế sau khi admin generate seats.

| Cột chính | Ý nghĩa |
|---|---|
| `event_id` | Event chứa ghế |
| `zone_id` | Khu ghế |
| `row_label` | Nhãn hàng, ví dụ `R1` |
| `seat_number` | Số ghế trong hàng |
| `seat_code` | Mã ghế, unique trong event |
| `status` | `AVAILABLE`, `LOCKED`, `SOLD` |
| `locked_by`, `locked_until` | User đang giữ và thời gian hết hạn |
| `sold_to` | User đã mua |

### `orders`

Lưu đơn hàng.

| Cột chính | Ý nghĩa |
|---|---|
| `order_code` | Mã đơn hàng duy nhất |
| `user_id` | Customer đặt |
| `event_id` | Event được mua |
| `status` | `PENDING`, `PAID`, `CANCELLED`, `EXPIRED` |
| `total_amount` | Tổng tiền |
| `expires_at` | Thời hạn giữ ghế/thanh toán |
| `paid_at` | Thời điểm thanh toán |

### `order_items`

Lưu từng ghế trong order.

| Cột chính | Ý nghĩa |
|---|---|
| `order_id` | Order chứa item |
| `seat_id` | Ghế được mua/giữ |
| `price` | Giá tại thời điểm tạo order |

### `seat_lock_logs`

Lưu lịch sử lock/release/sold ghế.

| Cột chính | Ý nghĩa |
|---|---|
| `seat_id` | Ghế |
| `user_id` | User thực hiện |
| `action` | `LOCKED`, `RELEASED`, `SOLD`, `FAILED_LOCK` |
| `reason` | Lý do |

Lưu ý: source hiện tại có enum `FAILED_LOCK`, nhưng chưa thấy service nào ghi action này.

### `queue_entries`

Lưu hàng chờ mua vé theo event/user.

| Cột chính | Ý nghĩa |
|---|---|
| `event_id` | Sự kiện |
| `user_id` | Customer |
| `queue_token` | Token hàng chờ |
| `status` | `WAITING`, `ACTIVE`, `EXPIRED`, `DONE` |
| `position_number` | Số thứ tự trong hàng |
| `activated_at`, `expires_at` | Thời gian được active và hết active |

## 8. Middleware

### Auth middleware

File: `src/modules/auth/auth.middleware.js`.

- `authenticate`:
  - Đọc header `Authorization: Bearer <token>`.
  - Verify JWT bằng `JWT_SECRET`.
  - Query user trong database.
  - Gắn public user vào `req.user`.
- `requireRole(role)`:
  - Kiểm tra `req.user.role`.
- `requireAdmin`:
  - Chỉ cho role `ADMIN`.
- `requireCustomer`:
  - Chỉ cho role `CUSTOMER`.

### Queue middleware

File: `src/modules/queue/queue.middleware.js`.

- `requireActiveQueueEntry`:
  - Nếu `QUEUE_ENABLED=false`: cho qua.
  - Nếu `QUEUE_ENABLED=true`: chỉ cho giữ ghế khi queue status là `ACTIVE` và `canEnter=true`.
  - Nếu chưa tới lượt: trả lỗi 403 kèm thông tin queue.

### Upload middleware

File: `src/modules/admin/event-upload.middleware.js`.

- Dùng `multer.diskStorage`.
- Lưu file vào `uploads/events`.
- Public URL dạng `/uploads/events/<filename>`.
- Field hỗ trợ: `banner`, `seatingChart`, `seating_chart`.
- Loại file hỗ trợ: JPG, PNG, WEBP, GIF.
- Giới hạn dung lượng: 5MB/file.

### Error handler

File: `src/utils/errors.js`.

- `AppError`: lỗi nghiệp vụ có `message`, `statusCode`, `details`.
- `asyncHandler`: wrapper cho async controller/middleware.
- `notFound`: trả lỗi khi không có endpoint.
- `errorHandler`: trả JSON lỗi. Với lỗi không phải `AppError`, response mặc định là `Lỗi hệ thống`.

### Validation

Dự án không dùng thư viện validation riêng như Joi/Zod/express-validator. Validation được viết trực tiếp trong service:

- Auth: kiểm tra email, mật khẩu, họ tên, gender.
- Admin event/zone: kiểm tra required string, date, số nguyên dương, giá tiền.
- Order/seat/queue: kiểm tra id số nguyên dương, trạng thái order, trạng thái ghế, thời hạn.

### Rate limit

Chưa xác định từ source code hiện tại. Không thấy middleware rate limit trong `package.json` hoặc `src/app.js`.

## 9. Module nghiệp vụ

### Auth/User module

Thư mục: `src/modules/auth`.

Chức năng:

- Đăng ký customer.
- Đăng nhập.
- Tạo JWT với payload gồm `sub` là user id và `role`.
- Lấy thông tin user hiện tại qua `/me`.
- Bảo vệ route bằng `authenticate`, `requireAdmin`, `requireCustomer`.

### Event module

Thư mục: `src/modules/events`.

Chức năng:

- Public xem danh sách event.
- Public xem chi tiết event.
- Public xem seat map.
- Mỗi lần đọc event/seat map sẽ gọi `releaseExpiredLocks` để giải phóng lock đã hết hạn.

### Admin module

Thư mục: `src/modules/admin`.

Chức năng:

- Quản lý event: tạo, cập nhật, xóa, publish.
- Upload banner/seating chart.
- Quản lý zone.
- Generate seats từ zone.
- Xem dashboard doanh thu/thống kê ghế.
- Xem thống kê audience theo gender/age group.
- Xem danh sách và chi tiết order.

### Seat module

Thư mục: `src/modules/seats`.

Chức năng:

- Customer giữ ghế.
- Tạo order `PENDING`.
- Cập nhật ghế thành `LOCKED`.
- Ghi item vào `order_items`.
- Ghi log `LOCKED` vào `seat_lock_logs`.

### Order module

Thư mục: `src/modules/orders`.

Chức năng:

- Customer xem danh sách order.
- Customer xem chi tiết order.
- Customer hủy giữ ghế.
- Customer xác nhận thanh toán nội bộ.
- Giải phóng lock hết hạn.
- Khi thanh toán thành công:
  - Order thành `PAID`.
  - Ghế thành `SOLD`.
  - Queue entry của user/event thành `DONE`.

### Queue module

Thư mục: `src/modules/queue`.

Chức năng:

- Customer vào hàng chờ.
- Xem vị trí trong hàng chờ.
- Rời hàng chờ.
- Cron job active batch người dùng đang `WAITING`.
- Entry `ACTIVE` hết hạn sẽ thành `EXPIRED`.

### Payment

Chưa thấy tích hợp cổng thanh toán bên ngoài từ source code hiện tại.

Hiện chỉ có endpoint:

```text
POST /api/customer/orders/:orderId/confirm-payment
```

Endpoint này xác nhận thanh toán nội bộ và đổi trạng thái trong database.

## 10. Cron jobs

### Giải phóng ghế hết hạn

File: `src/jobs/releaseExpiredSeats.job.js`.

- Chạy mỗi phút.
- Gọi `releaseExpiredLocks`.
- Ghế `LOCKED` có `locked_until < NOW()` sẽ về `AVAILABLE`.
- Order `PENDING` có `expires_at < NOW()` sẽ thành `EXPIRED`.

### Kích hoạt queue

File: `src/jobs/activateQueue.job.js`.

- Chỉ chạy khi `QUEUE_ENABLED=true`.
- Chạy mỗi phút.
- Active các queue entries đang `WAITING` theo `QUEUE_ACTIVE_BATCH_SIZE`.
- Mỗi entry active có thời hạn `QUEUE_ACTIVE_MINUTES`.

## 11. Test API bằng Postman hoặc Thunder Client

### Bước 1: tạo environment

Tạo biến:

| Biến | Giá trị ví dụ |
|---|---|
| `baseUrl` | `http://localhost:4000` |
| `token` | JWT nhận được sau login |
| `adminToken` | JWT của tài khoản admin |
| `eventId` | Id event muốn test |
| `orderId` | Id order muốn test |

### Bước 2: kiểm tra health

```http
GET {{baseUrl}}/health
```

### Bước 3: đăng ký hoặc đăng nhập customer

```http
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "12345678"
}
```

Lưu `token` từ response.

### Bước 4: đăng nhập admin

Sau khi chạy `npm run seed:admin`:

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "admin@ticketrush.local",
  "password": "Admin@123456"
}
```

Lưu `adminToken` từ response.

### Bước 5: gọi API cần token

Thêm header:

```http
Authorization: Bearer {{token}}
```

Với admin API:

```http
Authorization: Bearer {{adminToken}}
```

### Bước 6: flow test nhanh

1. Admin tạo event: `POST /api/admin/events`.
2. Admin tạo zone: `POST /api/admin/events/:eventId/zones`.
3. Admin generate seats: `POST /api/admin/events/:eventId/generate-seats`.
4. Admin publish event: `POST /api/admin/events/:eventId/publish`.
5. Customer xem event: `GET /api/events`.
6. Customer xem seat map: `GET /api/events/:eventId/seat-map`.
7. Nếu queue bật, customer join queue và chờ `ACTIVE`.
8. Customer giữ ghế: `POST /api/customer/events/:eventId/lock-seats`.
9. Customer xem order: `GET /api/customer/orders/:orderId`.
10. Customer xác nhận thanh toán: `POST /api/customer/orders/:orderId/confirm-payment`.

## 12. Scripts

| Script | Chức năng |
|---|---|
| `npm run dev` | Chạy server bằng `nodemon` |
| `npm start` | Chạy server bằng Node |
| `npm run db:migrate` | Tạo database/schema và chạy migrations |
| `npm run seed:admin` | Tạo admin từ biến `ADMIN_*` |

## 13. Những phần chưa xác định hoặc chưa có trong source hiện tại

- Không thấy `.env.example`.
- Không thấy test tự động.
- Không thấy rate limit middleware.
- Không thấy ORM/ODM.
- Không thấy tích hợp payment gateway bên ngoài.
- Không thấy tài liệu OpenAPI/Swagger.
- Không thấy route cập nhật/xóa user profile ngoài đăng ký, đăng nhập và `/me`.
