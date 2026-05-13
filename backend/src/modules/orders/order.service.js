const pool = require('../../config/database');
const { AppError } = require('../../utils/errors');
const { toPositiveInteger } = require('../../utils/ids');

function formatOrder(row) {
  return {
    id: row.id,
    orderCode: row.order_code,
    userId: row.user_id,
    eventId: row.event_id,
    status: row.status,
    totalAmount: Number(row.total_amount || 0),
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    event: row.event_title
      ? {
          id: row.event_id,
          title: row.event_title,
          location: row.event_location,
          startTime: row.event_start_time
        }
      : undefined
  };
}

function formatOrderItem(row) {
  return {
    id: row.id,
    seatId: row.seat_id,
    seatCode: row.seat_code,
    rowLabel: row.row_label,
    seatNumber: row.seat_number,
    zoneName: row.zone_name,
    price: Number(row.price || 0),
    createdAt: row.created_at
  };
}

async function insertSeatLogs(conn, rows) {
  const values = rows
    .filter((row) => row.user_id)
    .map((row) => [row.seat_id, row.user_id, row.action, row.reason || null]);

  if (!values.length) return;

  await conn.query(
    'INSERT INTO seat_lock_logs (seat_id, user_id, action, reason) VALUES ?',
    [values]
  );
}

async function releaseExpiredLocks(existingConn = null) {
  const conn = existingConn || await pool.getConnection();
  const shouldManageTransaction = !existingConn;

  try {
    if (shouldManageTransaction) await conn.beginTransaction();

    const [expiredSeats] = await conn.query(
      `
      SELECT id AS seat_id, locked_by AS user_id
      FROM seats
      WHERE status = 'LOCKED'
        AND locked_until < NOW()
      FOR UPDATE
      `
    );

    if (expiredSeats.length) {
      await insertSeatLogs(
        conn,
        expiredSeats.map((seat) => ({
          ...seat,
          action: 'RELEASED',
          reason: 'Lock expired'
        }))
      );

      await conn.query(
        `
        UPDATE seats
        SET status = 'AVAILABLE',
            locked_by = NULL,
            locked_until = NULL
        WHERE id IN (?)
        `,
        [expiredSeats.map((seat) => seat.seat_id)]
      );
    }

    await conn.query(
      `
      UPDATE orders
      SET status = 'EXPIRED'
      WHERE status = 'PENDING'
        AND expires_at < NOW()
      `
    );

    if (shouldManageTransaction) await conn.commit();

    return {
      releasedSeats: expiredSeats.length
    };
  } catch (err) {
    if (shouldManageTransaction) await conn.rollback();
    throw err;
  } finally {
    if (shouldManageTransaction) conn.release();
  }
}

async function releaseOrderSeats(conn, orderId, userId, reason = 'Order expired') {
  const [seats] = await conn.query(
    `
    SELECT s.id AS seat_id, s.locked_by AS user_id
    FROM order_items oi
    JOIN seats s ON s.id = oi.seat_id
    WHERE oi.order_id = ?
      AND s.status = 'LOCKED'
      AND s.locked_by = ?
    FOR UPDATE
    `,
    [orderId, userId]
  );

  if (!seats.length) return;

  await insertSeatLogs(
    conn,
    seats.map((seat) => ({
      ...seat,
      action: 'RELEASED',
      reason
    }))
  );

  await conn.query(
    `
    UPDATE seats
    SET status = 'AVAILABLE',
        locked_by = NULL,
        locked_until = NULL
    WHERE id IN (?)
    `,
    [seats.map((seat) => seat.seat_id)]
  );
}

async function listOrders(userId) {
  await releaseExpiredLocks();

  const [rows] = await pool.query(
    `
    SELECT
      o.*,
      e.title AS event_title,
      e.location AS event_location,
      e.start_time AS event_start_time
    FROM orders o
    JOIN events e ON e.id = o.event_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
    `,
    [userId]
  );

  return rows.map(formatOrder);
}

async function getOrder(userId, orderId) {
  await releaseExpiredLocks();
  const id = toPositiveInteger(orderId, 'orderId');

  const [orders] = await pool.query(
    `
    SELECT
      o.*,
      e.title AS event_title,
      e.location AS event_location,
      e.start_time AS event_start_time
    FROM orders o
    JOIN events e ON e.id = o.event_id
    WHERE o.id = ?
      AND o.user_id = ?
    LIMIT 1
    `,
    [id, userId]
  );

  if (!orders.length) {
    throw new AppError('Không tìm thấy đơn hàng', 404);
  }

  const [items] = await pool.query(
    `
    SELECT
      oi.*,
      s.seat_code,
      s.row_label,
      s.seat_number,
      z.name AS zone_name
    FROM order_items oi
    JOIN seats s ON s.id = oi.seat_id
    JOIN seat_zones z ON z.id = s.zone_id
    WHERE oi.order_id = ?
    ORDER BY z.id ASC, CAST(SUBSTRING(s.row_label, 2) AS UNSIGNED) ASC, s.seat_number ASC
    `,
    [id]
  );

  return {
    order: formatOrder(orders[0]),
    items: items.map(formatOrderItem)
  };
}

async function confirmPayment(userId, orderId) {
  const id = toPositiveInteger(orderId, 'orderId');
  const conn = await pool.getConnection();
  let committed = false;

  try {
    await conn.beginTransaction();

    const [orders] = await conn.query(
      `
      SELECT *
      FROM orders
      WHERE id = ?
        AND user_id = ?
      FOR UPDATE
      `,
      [id, userId]
    );

    if (!orders.length) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    const order = orders[0];
    if (order.status !== 'PENDING') {
      throw new AppError('Đơn hàng không còn ở trạng thái chờ thanh toán', 409);
    }

    if (new Date(order.expires_at).getTime() < Date.now()) {
      await releaseOrderSeats(conn, id, userId, 'Order expired before payment');
      await conn.query('UPDATE orders SET status = \'EXPIRED\' WHERE id = ?', [id]);
      await conn.commit();
      committed = true;
      throw new AppError('Đơn hàng đã hết hạn', 409);
    }

    const [items] = await conn.query(
      `
      SELECT oi.seat_id, s.status, s.locked_by, s.locked_until
      FROM order_items oi
      JOIN seats s ON s.id = oi.seat_id
      WHERE oi.order_id = ?
      FOR UPDATE
      `,
      [id]
    );

    if (!items.length) {
      throw new AppError('Đơn hàng không có ghế', 409);
    }

    for (const item of items) {
      if (item.status !== 'LOCKED' || Number(item.locked_by) !== Number(userId)) {
        throw new AppError('Ghế không còn được giữ bởi tài khoản này', 409);
      }
    }

    await conn.query(
      `
      UPDATE seats
      SET status = 'SOLD',
          sold_to = ?,
          locked_by = NULL,
          locked_until = NULL
      WHERE id IN (?)
      `,
      [userId, items.map((item) => item.seat_id)]
    );

    await insertSeatLogs(
      conn,
      items.map((item) => ({
        seat_id: item.seat_id,
        user_id: userId,
        action: 'SOLD',
        reason: 'Payment confirmed'
      }))
    );

    await conn.query(
      `
      UPDATE orders
      SET status = 'PAID', paid_at = NOW()
      WHERE id = ?
      `,
      [id]
    );

    await conn.query(
      `
      UPDATE queue_entries
      SET status = 'DONE'
      WHERE event_id = ?
        AND user_id = ?
        AND status IN ('WAITING', 'ACTIVE')
      `,
      [order.event_id, userId]
    );

    await conn.commit();
    committed = true;

    return getOrder(userId, id);
  } catch (err) {
    if (!committed) await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function cancelHold(userId, orderId) {
  const id = toPositiveInteger(orderId, 'orderId');
  const conn = await pool.getConnection();
  let committed = false;

  try {
    await conn.beginTransaction();

    const [orders] = await conn.query(
      `
      SELECT *
      FROM orders
      WHERE id = ?
        AND user_id = ?
      FOR UPDATE
      `,
      [id, userId]
    );

    if (!orders.length) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    const order = orders[0];
    if (order.status !== 'PENDING') {
      throw new AppError('Đơn hàng không còn ở trạng thái giữ ghế', 409);
    }

    if (new Date(order.expires_at).getTime() < Date.now()) {
      await releaseOrderSeats(conn, id, userId, 'Order expired before hold cancellation');
      await conn.query('UPDATE orders SET status = \'EXPIRED\' WHERE id = ?', [id]);
      await conn.commit();
      committed = true;
      throw new AppError('Đơn hàng đã hết hạn', 409);
    }

    await releaseOrderSeats(conn, id, userId, 'Hold cancelled by customer');
    await conn.query(
      `
      UPDATE orders
      SET status = 'CANCELLED'
      WHERE id = ?
      `,
      [id]
    );

    await conn.commit();
    committed = true;

    return getOrder(userId, id);
  } catch (err) {
    if (!committed) await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  formatOrder,
  formatOrderItem,
  insertSeatLogs,
  releaseExpiredLocks,
  releaseOrderSeats,
  listOrders,
  getOrder,
  confirmPayment,
  cancelHold
};
