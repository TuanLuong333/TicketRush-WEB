const pool = require('../../config/database');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const { toPositiveInteger, uniquePositiveIntegers } = require('../../utils/ids');
const { generateOrderCode } = require('../../utils/generateCode');
const { insertSeatLogs, releaseExpiredLocks } = require('../orders/order.service');

function ensureEventOpenForSale(event) {
  if (event.status !== 'PUBLISHED') {
    throw new AppError('Sự kiện chưa mở bán', 409);
  }

  const now = Date.now();
  if (event.sale_start_time && new Date(event.sale_start_time).getTime() > now) {
    throw new AppError('Sự kiện chưa đến thời gian mở bán', 409);
  }

  if (event.sale_end_time && new Date(event.sale_end_time).getTime() < now) {
    throw new AppError('Sự kiện đã kết thúc thời gian mở bán', 409);
  }
}

async function lockSeats(userId, eventIdInput, seatIdsInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const seatIds = uniquePositiveIntegers(seatIdsInput, 'seatIds');

  if (seatIds.length > 20) {
    throw new AppError('Chỉ được giữ tối đa 20 ghế mỗi lần', 400);
  }

  await releaseExpiredLocks();

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [events] = await conn.query(
      'SELECT * FROM events WHERE id = ? LIMIT 1',
      [eventId]
    );
    if (!events.length) {
      throw new AppError('Không tìm thấy sự kiện', 404);
    }
    ensureEventOpenForSale(events[0]);

    const [seats] = await conn.query(
      `
      SELECT
        s.id,
        s.status,
        s.locked_until,
        s.locked_by,
        s.seat_code,
        s.row_label,
        s.seat_number,
        z.name AS zone_name,
        z.price
      FROM seats s
      JOIN seat_zones z ON z.id = s.zone_id
      WHERE s.event_id = ?
        AND s.id IN (?)
      ORDER BY s.id ASC
      FOR UPDATE
      `,
      [eventId, seatIds]
    );

    if (seats.length !== seatIds.length) {
      throw new AppError('Một số ghế không tồn tại trong sự kiện này', 404);
    }

    const now = Date.now();
    for (const seat of seats) {
      const expiredLock = seat.status === 'LOCKED'
        && seat.locked_until
        && new Date(seat.locked_until).getTime() < now;
      const canLock = seat.status === 'AVAILABLE' || expiredLock;

      if (!canLock) {
        throw new AppError(`Ghế ${seat.seat_code} không còn khả dụng`, 409);
      }
    }

    const orderCode = generateOrderCode();
    const expiresAt = new Date(Date.now() + env.lockDurationMinutes * 60 * 1000);
    const totalAmount = seats.reduce((sum, seat) => sum + Number(seat.price), 0);

    const [orderResult] = await conn.query(
      `
      INSERT INTO orders (order_code, user_id, event_id, status, total_amount, expires_at)
      VALUES (?, ?, ?, 'PENDING', ?, ?)
      `,
      [orderCode, userId, eventId, totalAmount, expiresAt]
    );
    const orderId = orderResult.insertId;

    await conn.query(
      `
      UPDATE seats
      SET status = 'LOCKED',
          locked_by = ?,
          locked_until = ?,
          sold_to = NULL
      WHERE id IN (?)
      `,
      [userId, expiresAt, seatIds]
    );

    await conn.query(
      'INSERT INTO order_items (order_id, seat_id, price) VALUES ?',
      [seats.map((seat) => [orderId, seat.id, Number(seat.price)])]
    );

    await insertSeatLogs(
      conn,
      seats.map((seat) => ({
        seat_id: seat.id,
        user_id: userId,
        action: 'LOCKED',
        reason: 'Customer locked seat'
      }))
    );

    await conn.commit();

    return {
      order: {
        id: orderId,
        orderCode,
        userId,
        eventId,
        status: 'PENDING',
        totalAmount,
        expiresAt
      },
      items: seats.map((seat) => ({
        seatId: seat.id,
        seatCode: seat.seat_code,
        rowLabel: seat.row_label,
        seatNumber: seat.seat_number,
        zoneName: seat.zone_name,
        price: Number(seat.price)
      }))
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  lockSeats
};
