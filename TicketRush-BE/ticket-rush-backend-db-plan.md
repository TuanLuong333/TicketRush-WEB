# TicketRush - Plan xây dựng CSDL MySQL và Backend ExpressJS

## 1. Mục tiêu dự án

TicketRush là web đặt vé online cho sự kiện âm nhạc/giải trí, trọng tâm là:

- Customer:
  - Xem danh sách và chi tiết sự kiện.
  - Xem sơ đồ ghế.
  - Chọn ghế, giữ ghế trong 10 phút.
  - Xác nhận thanh toán giả lập.
  - Xem đơn hàng đã thanh toán thành công.
- Admin:
  - Quản lý sự kiện.
  - Khai báo ma trận ghế theo khu vực.
  - Gán giá vé theo khu vực/loại ghế.
  - Theo dõi doanh thu, tỷ lệ lấp đầy realtime.
  - Thống kê khách hàng theo tuổi, giới tính.
- Kỹ thuật bắt buộc:
  - Có transaction/row locking khi giữ ghế.
  - Không bán trùng ghế khi nhiều người click cùng lúc.
  - Có vòng đời vé: Available -> Locked -> Sold/Released.
  - Có cron/background job tự release ghế quá hạn.
  - Có cập nhật trạng thái ghế realtime hoặc polling.
  - Có thiết kế Virtual Queue ở mức vừa đủ.

## 2. Công nghệ đề xuất

### Backend

- Node.js
- ExpressJS
- MySQL 8
- mysql2/promise
- JWT authentication
- bcrypt
- dotenv
- cors
- helmet
- morgan
- node-cron
- polling API

## 3. Thiết kế vai trò người dùng

### Role

- `CUSTOMER`
- `ADMIN`

### Luồng đăng nhập

- User đăng ký tài khoản customer.
- Admin có thể tạo sẵn bằng seed hoặc insert trực tiếp.
- Login trả JWT.
- Middleware:
  - `authenticate`
  - `requireAdmin`
  - `requireCustomer`

## 4. Thiết kế cơ sở dữ liệu MySQL

### 4.1. Bảng `users`

Lưu thông tin tài khoản và hồ sơ thống kê.

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
  date_of_birth DATE NULL,
  phone VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Mục đích:

- Dùng cho đăng nhập.
- Dùng `gender`, `date_of_birth` để thống kê độ tuổi, giới tính.

### 4.2. Bảng `events`

Lưu thông tin sự kiện.

```sql
CREATE TABLE events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  location VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  sale_start_time DATETIME NULL,
  sale_end_time DATETIME NULL,
  status ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'FINISHED') NOT NULL DEFAULT 'DRAFT',
  banner_url VARCHAR(500) NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_events_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

Index nên có:

```sql
CREATE INDEX idx_events_status_start_time ON events(status, start_time);
CREATE INDEX idx_events_title ON events(title);
```

### 4.3. Bảng `seat_zones`

Mỗi sự kiện có nhiều khu ghế, ví dụ VIP, A, B.

```sql
CREATE TABLE seat_zones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  row_count INT NOT NULL,
  seats_per_row INT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  color VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_seat_zones_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_event_zone_name UNIQUE (event_id, name)
);
```

Ví dụ:

- Zone A: 10 hàng, mỗi hàng 15 ghế, giá 1.500.000.
- Zone B: 20 hàng, mỗi hàng 20 ghế, giá 800.000.

### 4.4. Bảng `seats`

Mỗi ghế vật lý trong sự kiện.

```sql
CREATE TABLE seats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  zone_id BIGINT NOT NULL,
  row_label VARCHAR(10) NOT NULL,
  seat_number INT NOT NULL,
  seat_code VARCHAR(50) NOT NULL,
  status ENUM('AVAILABLE', 'LOCKED', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
  locked_by BIGINT NULL,
  locked_until DATETIME NULL,
  sold_to BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_seats_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_seats_zone
    FOREIGN KEY (zone_id) REFERENCES seat_zones(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_seats_locked_by
    FOREIGN KEY (locked_by) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_seats_sold_to
    FOREIGN KEY (sold_to) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT uq_event_seat_code UNIQUE (event_id, seat_code)
);
```

Index quan trọng:

```sql
CREATE INDEX idx_seats_event_status ON seats(event_id, status);
CREATE INDEX idx_seats_locked_until ON seats(status, locked_until);
CREATE INDEX idx_seats_locked_by ON seats(locked_by);
```

Ghi chú:

- Không cần bảng inventory riêng vì `seats` chính là nguồn dữ liệu quản lý trạng thái ghế.
- Status `RELEASED` không cần lưu trực tiếp trong `seats`; khi release thì ghế quay về `AVAILABLE`.
- Nếu cần audit lịch sử release, xem bảng `seat_locks`.

### 4.5. Bảng `orders`

Đơn hàng của customer.

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_code VARCHAR(50) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  event_id BIGINT NOT NULL,
  status ENUM('PENDING', 'PAID', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  expires_at DATETIME NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id),

  CONSTRAINT fk_orders_event
    FOREIGN KEY (event_id) REFERENCES events(id)
);
```

Index:

```sql
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_event_status ON orders(event_id, status);
CREATE INDEX idx_orders_expires_at ON orders(status, expires_at);
```

### 4.6. Bảng `order_items`

Ghế trong đơn hàng.

```sql
CREATE TABLE order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  seat_id BIGINT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_order_items_seat
    FOREIGN KEY (seat_id) REFERENCES seats(id),

  CONSTRAINT uq_order_seat UNIQUE (order_id, seat_id)
);
```

Index:

```sql
CREATE INDEX idx_order_items_seat ON order_items(seat_id);
```

### 4.7. Bảng `seat_lock_logs` - optional nhưng nên có

Dùng để debug/demo lịch sử giữ/nhả ghế.

```sql
CREATE TABLE seat_lock_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  seat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  action ENUM('LOCKED', 'RELEASED', 'SOLD', 'FAILED_LOCK') NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_seat_lock_logs_seat
    FOREIGN KEY (seat_id) REFERENCES seats(id),

  CONSTRAINT fk_seat_lock_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4.8. Bảng `queue_entries` - Virtual Queue đơn giản

```sql
CREATE TABLE queue_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  queue_token VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('WAITING', 'ACTIVE', 'EXPIRED', 'DONE') NOT NULL DEFAULT 'WAITING',
  position_number BIGINT NOT NULL,
  activated_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_queue_entries_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_queue_entries_user
    FOREIGN KEY (user_id) REFERENCES users(id),

  CONSTRAINT uq_queue_user_event UNIQUE (event_id, user_id)
);
```

Index:

```sql
CREATE INDEX idx_queue_event_status_position
ON queue_entries(event_id, status, position_number);
```

## 5. Luồng dữ liệu chính

### 5.1. Admin tạo event và ma trận ghế

API:

```http
POST /api/admin/events
POST /api/admin/events/:eventId/zones
POST /api/admin/events/:eventId/generate-seats
```

Luồng xử lý:

1. Admin tạo event.
2. Admin tạo zone:
   - name
   - row_count
   - seats_per_row
   - price
3. Backend generate seats:
   - Zone A, 10 hàng, 15 ghế/hàng.
   - Sinh ghế:
     - A-R1-S1
     - A-R1-S2
     - ...
     - A-R10-S15

Logic generate:

- Với mỗi zone:
  - Loop row từ 1 đến `row_count`.
  - Loop seat từ 1 đến `seats_per_row`.
  - Insert vào `seats`.

Không nên cho generate lại nếu zone đã có ghế, tránh duplicate.

### 5.2. Customer xem danh sách event

```http
GET /api/events?keyword=&status=PUBLISHED
GET /api/events/:eventId
```

Trả về:

- Thông tin event.
- Các zone và giá.
- Thống kê đơn giản:
  - total seats
  - available seats
  - sold seats
  - locked seats

### 5.3. Customer xem sơ đồ ghế

```http
GET /api/events/:eventId/seat-map
```

Response mẫu:

```json
{
  "event": {
    "id": 1,
    "title": "Concert A"
  },
  "zones": [
    {
      "id": 1,
      "name": "VIP",
      "price": 1500000,
      "rows": [
        {
          "rowLabel": "R1",
          "seats": [
            {
              "id": 1,
              "seatCode": "VIP-R1-S1",
              "status": "AVAILABLE"
            }
          ]
        }
      ]
    }
  ]
}
```

Frontend dùng response này để vẽ ma trận ghế.

## 6. Luồng giữ ghế chống race condition

### 6.1. API giữ một hoặc nhiều ghế

```http
POST /api/customer/events/:eventId/lock-seats
Authorization: Bearer <token>
```

Body:

```json
{
  "seatIds": [1, 2, 3]
}
```

### 6.2. Nguyên tắc kỹ thuật

Bắt buộc dùng:

```sql
START TRANSACTION;
SELECT ... FOR UPDATE;
UPDATE ...
COMMIT;
```

Mục tiêu:

- Nếu 2 user cùng giữ ghế A1:
  - Request 1 lock row trước.
  - Request 2 phải chờ.
  - Sau khi request 1 update status `LOCKED`, request 2 đọc lại thấy không còn `AVAILABLE`, trả lỗi.

### 6.3. Pseudocode lock seats

```js
async function lockSeats(userId, eventId, seatIds) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    seatIds.sort((a, b) => a - b);

    const [seats] = await conn.query(
      `
      SELECT id, status, locked_until
      FROM seats
      WHERE event_id = ?
        AND id IN (?)
      FOR UPDATE
      `,
      [eventId, seatIds]
    );

    if (seats.length !== seatIds.length) {
      throw new Error('Một số ghế không tồn tại');
    }

    const now = new Date();

    for (const seat of seats) {
      const isExpiredLock =
        seat.status === 'LOCKED' &&
        seat.locked_until &&
        new Date(seat.locked_until) < now;

      const canLock = seat.status === 'AVAILABLE' || isExpiredLock;

      if (!canLock) {
        throw new Error(`Ghế ${seat.id} không còn khả dụng`);
      }
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [orderResult] = await conn.query(
      `
      INSERT INTO orders
      (order_code, user_id, event_id, status, total_amount, expires_at)
      VALUES (?, ?, ?, 'PENDING', 0, ?)
      `,
      [generateOrderCode(), userId, eventId, expiresAt]
    );

    const orderId = orderResult.insertId;
    let totalAmount = 0;

    for (const seat of seats) {
      const [priceRows] = await conn.query(
        `
        SELECT z.price
        FROM seats s
        JOIN seat_zones z ON z.id = s.zone_id
        WHERE s.id = ?
        `,
        [seat.id]
      );

      const price = priceRows[0].price;
      totalAmount += Number(price);

      await conn.query(
        `
        UPDATE seats
        SET status = 'LOCKED',
            locked_by = ?,
            locked_until = ?
        WHERE id = ?
        `,
        [userId, expiresAt, seat.id]
      );

      await conn.query(
        `
        INSERT INTO order_items (order_id, seat_id, price)
        VALUES (?, ?, ?)
        `,
        [orderId, seat.id, price]
      );
    }

    await conn.query(
      `UPDATE orders SET total_amount = ? WHERE id = ?`,
      [totalAmount, orderId]
    );

    await conn.commit();

    return { orderId, expiresAt };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

### 6.4. Lưu ý quan trọng

- Phải dùng InnoDB.
- `seats.id` là primary key nên row lock hiệu quả.
- Không dùng check rồi update ở 2 query không transaction.
- Không lock cả bảng.
- Nên sort `seatIds` trước khi lock để giảm deadlock khi nhiều user giữ nhiều ghế.

## 7. Luồng checkout giả lập

### 7.1. API xem đơn hàng

```http
GET /api/customer/orders/:orderId
```

Trả về:

- Order info.
- Danh sách ghế.
- Tổng tiền.
- `expiresAt`.

### 7.2. API xác nhận thanh toán

```http
POST /api/customer/orders/:orderId/confirm-payment
```

### 7.3. Pseudocode checkout

```js
async function confirmPayment(userId, orderId) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [orders] = await conn.query(
      `
      SELECT id, user_id, event_id, status, expires_at
      FROM orders
      WHERE id = ? AND user_id = ?
      FOR UPDATE
      `,
      [orderId, userId]
    );

    if (!orders.length) throw new Error('Không tìm thấy đơn hàng');

    const order = orders[0];

    if (order.status !== 'PENDING') {
      throw new Error('Đơn hàng không còn ở trạng thái chờ thanh toán');
    }

    if (new Date(order.expires_at) < new Date()) {
      await releaseOrderSeats(conn, orderId, userId);
      await conn.query(`UPDATE orders SET status = 'EXPIRED' WHERE id = ?`, [orderId]);
      throw new Error('Đơn hàng đã hết hạn');
    }

    const [items] = await conn.query(
      `
      SELECT oi.seat_id, s.status, s.locked_by, s.locked_until
      FROM order_items oi
      JOIN seats s ON s.id = oi.seat_id
      WHERE oi.order_id = ?
      FOR UPDATE
      `,
      [orderId]
    );

    for (const item of items) {
      if (item.status !== 'LOCKED' || item.locked_by !== userId) {
        throw new Error('Ghế không còn được giữ bởi user này');
      }
    }

    for (const item of items) {
      await conn.query(
        `
        UPDATE seats
        SET status = 'SOLD',
            sold_to = ?,
            locked_by = NULL,
            locked_until = NULL
        WHERE id = ?
        `,
        [userId, item.seat_id]
      );

    }

    await conn.query(
      `UPDATE orders SET status = 'PAID', paid_at = NOW() WHERE id = ?`,
      [orderId]
    );

    await conn.commit();

    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

## 8. Background job release ghế hết hạn

### 8.1. Dùng node-cron

Chạy mỗi 30 giây hoặc 1 phút.

```js
cron.schedule('* * * * *', async () => {
  await releaseExpiredLocks();
});
```

### 8.2. Logic release

```sql
UPDATE seats
SET status = 'AVAILABLE',
    locked_by = NULL,
    locked_until = NULL
WHERE status = 'LOCKED'
  AND locked_until < NOW();
```

Sau đó update order:

```sql
UPDATE orders
SET status = 'EXPIRED'
WHERE status = 'PENDING'
  AND expires_at < NOW();
```

### 8.3. Nên làm trong transaction

```js
async function releaseExpiredLocks() {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(`
      UPDATE seats
      SET status = 'AVAILABLE',
          locked_by = NULL,
          locked_until = NULL
      WHERE status = 'LOCKED'
        AND locked_until < NOW()
    `);

    await conn.query(`
      UPDATE orders
      SET status = 'EXPIRED'
      WHERE status = 'PENDING'
        AND expires_at < NOW()
    `);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
  } finally {
    conn.release();
  }
}
```

## 9. Realtime seat map

Có 2 phương án.

### 9.1. Phương án đơn giản: Polling

Frontend gọi mỗi 2-3 giây:

```http
GET /api/events/:eventId/seat-map
```

Ưu điểm:

- Dễ làm.
- Đủ đáp ứng tiêu chí “không cần F5”.

Nhược điểm:

- Không realtime hoàn toàn.
- Tốn request hơn.

### 9.2. Phương án tốt hơn: Socket.IO

Khi lock/release/sold ghế thành công, backend emit:

```js
io.to(`event:${eventId}`).emit('seat-status-changed', {
  seatIds,
  status: 'LOCKED'
});
```

Client join room:

```js
socket.emit('join-event', eventId);
```

Event nên có:

- `seat-status-changed`
- `order-paid`
- `seats-released`
- `dashboard-updated`

Khuyến nghị:

- Nếu thời gian ít: polling.
- Nếu muốn demo ấn tượng: Socket.IO.

## 10. Admin dashboard

### 10.1. API doanh thu và lấp đầy ghế

```http
GET /api/admin/events/:eventId/dashboard
```

Response:

```json
{
  "revenue": 120000000,
  "totalSeats": 1000,
  "soldSeats": 350,
  "lockedSeats": 50,
  "availableSeats": 600,
  "occupancyRate": 35
}
```

SQL:

```sql
SELECT
  COUNT(*) AS totalSeats,
  SUM(status = 'SOLD') AS soldSeats,
  SUM(status = 'LOCKED') AS lockedSeats,
  SUM(status = 'AVAILABLE') AS availableSeats
FROM seats
WHERE event_id = ?;
```

Revenue:

```sql
SELECT COALESCE(SUM(total_amount), 0) AS revenue
FROM orders
WHERE event_id = ?
  AND status = 'PAID';
```

### 10.2. Thống kê giới tính

```http
GET /api/admin/events/:eventId/audience-statistics
```

SQL dựa trên các đơn hàng đã thanh toán:

```sql
SELECT u.gender, COUNT(DISTINCT o.user_id) AS total
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.event_id = ?
  AND o.status = 'PAID'
GROUP BY u.gender;
```

### 10.3. Thống kê độ tuổi

Có thể chia nhóm:

- `<18`
- `18-24`
- `25-34`
- `35-44`
- `45+`

SQL có thể dùng `TIMESTAMPDIFF` và dựa trên các đơn hàng đã thanh toán.

```sql
SELECT
  CASE
    WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) < 18 THEN '<18'
    WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 18 AND 24 THEN '18-24'
    WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 25 AND 34 THEN '25-34'
    WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 35 AND 44 THEN '35-44'
    ELSE '45+'
  END AS age_group,
  COUNT(DISTINCT o.user_id) AS total
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.event_id = ?
  AND o.status = 'PAID'
GROUP BY age_group;
```

## 11. Virtual Queue - thiết kế vừa đủ

### 11.1. Mục tiêu

Khi lượng người truy cập màn hình chọn ghế quá nhiều, không cho tất cả vào trực tiếp mà đưa vào hàng chờ.

### 11.2. Cách làm đơn giản

Không cần Redis nếu dự án muốn gọn. Dùng MySQL bảng `queue_entries`.

Luồng:

1. User bấm “Mua vé”.
2. Backend kiểm tra user đã có queue entry chưa.
3. Nếu chưa có:
   - Tạo `queue_token`.
   - Gán `position_number = MAX(position_number) + 1`.
   - Status `WAITING`.
4. Cron hoặc API admin/background worker mỗi vài giây activate 50 user đầu tiên.
5. User gọi polling:
   - `GET /api/events/:eventId/queue/status`
6. Nếu status `ACTIVE`, user được vào seat map trong 10 phút.
7. Nếu đặt vé xong, status `DONE`.

### 11.3. API queue

```http
POST /api/events/:eventId/queue/join
GET /api/events/:eventId/queue/status
POST /api/events/:eventId/queue/leave
```

### 11.4. Activate queue batch

```sql
UPDATE queue_entries
SET status = 'ACTIVE',
    activated_at = NOW(),
    expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
WHERE event_id = ?
  AND status = 'WAITING'
ORDER BY position_number ASC
LIMIT 50;
```

Lưu ý:

- MySQL không cho `ORDER BY LIMIT` trong một số dạng update phức tạp tùy version, có thể select ids trước rồi update.
- Active token hết hạn thì chuyển `EXPIRED`.

### 11.5. Middleware kiểm tra quyền vào seat map

Nếu bật queue cho event:

- API lock seat cần kiểm tra user có queue entry `ACTIVE`.
- Nếu không active, trả:

```json
{
  "message": "Bạn đang ở phòng chờ",
  "queueRequired": true
}
```

## 12. Cấu trúc backend ExpressJS

Đề xuất:

```txt
backend/
  src/
    app.js
    server.js

    config/
      database.js
      env.js
      socket.js

    modules/
      auth/
        auth.routes.js
        auth.controller.js
        auth.service.js
        auth.middleware.js

      users/
        user.routes.js
        user.controller.js
        user.service.js

      events/
        event.routes.js
        event.controller.js
        event.service.js

      seats/
        seat.routes.js
        seat.controller.js
        seat.service.js

      orders/
        order.routes.js
        order.controller.js
        order.service.js

      admin/
        admin.routes.js
        admin.controller.js
        admin.service.js

      queue/
        queue.routes.js
        queue.controller.js
        queue.service.js

    jobs/
      releaseExpiredSeats.job.js
      activateQueue.job.js

    utils/
      generateCode.js
      errors.js

    migrations/
      001_create_users.sql
      002_create_events.sql
      003_create_seat_zones.sql
      004_create_seats.sql
      005_create_orders.sql
      006_create_order_items.sql
      007_create_queue_entries.sql

    seed/
      admin.seed.js
```

## 13. Danh sách API đề xuất

### 13.1. Auth

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

### 13.2. Public/Customer events

```http
GET /api/events
GET /api/events/:eventId
GET /api/events/:eventId/seat-map
```

### 13.3. Customer lock/checkout

```http
POST /api/customer/events/:eventId/lock-seats
GET /api/customer/orders
GET /api/customer/orders/:orderId
POST /api/customer/orders/:orderId/confirm-payment
```

### 13.4. Admin events/seats

```http
POST /api/admin/events
PUT /api/admin/events/:eventId
DELETE /api/admin/events/:eventId
POST /api/admin/events/:eventId/publish

POST /api/admin/events/:eventId/zones
GET /api/admin/events/:eventId/zones
POST /api/admin/events/:eventId/generate-seats
```

### 13.5. Admin dashboard

```http
GET /api/admin/events/:eventId/dashboard
GET /api/admin/events/:eventId/audience-statistics
```

### 13.6. Queue

```http
POST /api/events/:eventId/queue/join
GET /api/events/:eventId/queue/status
POST /api/events/:eventId/queue/leave
```

## 14. Quy tắc nghiệp vụ quan trọng

### 14.1. Ghế

- `AVAILABLE`: user có thể giữ.
- `LOCKED`: đang được giữ bởi một user.
- `SOLD`: đã thanh toán, không thể giữ.
- Lock quá hạn thì quay về `AVAILABLE`.

### 14.2. Order

- `PENDING`: đã lock ghế, chờ thanh toán.
- `PAID`: đã xác nhận thanh toán.
- `EXPIRED`: quá hạn 10 phút.
- `CANCELLED`: user hủy.

### 14.3. Thanh toán giả lập

- Sau khi customer bấm nút xác nhận thanh toán, order chuyển từ `PENDING` sang `PAID`.
- Các ghế trong order chuyển từ `LOCKED` sang `SOLD`.
- Không cần bảng vé riêng trong phạm vi hiện tại.
- Trang kết quả chỉ cần hiển thị đơn hàng thanh toán thành công, danh sách ghế và tổng tiền.

### 14.4. Không bán trùng ghế

Các điểm đảm bảo:

1. `SELECT ... FOR UPDATE` lock row ghế.
2. Transaction bao trọn check và update.
3. Khi checkout cũng lock order và seats.
4. Ghế đã `SOLD` không thể quay lại `AVAILABLE` nếu không có nghiệp vụ hủy/refund riêng.


