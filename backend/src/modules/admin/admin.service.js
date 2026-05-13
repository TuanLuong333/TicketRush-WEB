const pool = require('../../config/database');
const { AppError } = require('../../utils/errors');
const { toPositiveInteger } = require('../../utils/ids');
const { EVENT_STATUSES, formatEvent, formatStats, formatZone } = require('../events/event.service');
const { formatOrderItem, releaseExpiredLocks } = require('../orders/order.service');

const ORDER_STATUSES = new Set(['PENDING', 'PAID', 'CANCELLED', 'EXPIRED']);

function formatOrder(row) {
  return {
    id: row.id,
    orderCode: row.orderCode,
    userId: row.userId,
    eventId: row.eventId,
    event: {
      id: row.eventId,
      title: row.eventTitle
    },
    user: {
      id: row.userId,
      fullName: row.userFullName,
      email: row.userEmail,
      phone: row.userPhone
    },
    status: row.status,
    totalAmount: Number(row.totalAmount || 0),
    itemCount: Number(row.itemCount || 0),
    expiresAt: row.expiresAt,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function listOrders(query = {}) {
  await releaseExpiredLocks();

  const page = Number.parseInt(query.page || '1', 10);
  const limit = Number.parseInt(query.limit || '20', 10);

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError('page phải là số nguyên dương', 400);
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError('limit phải là số nguyên dương và không vượt quá 100', 400);
  }

  const where = [];
  const params = [];

  if (query.eventId) {
    const eventId = toPositiveInteger(query.eventId, 'eventId');
    where.push('o.event_id = ?');
    params.push(eventId);
  }

  if (query.userId) {
    const userId = toPositiveInteger(query.userId, 'userId');
    where.push('o.user_id = ?');
    params.push(userId);
  }

  if (query.status) {
    const status = String(query.status).trim().toUpperCase();

    if (!ORDER_STATUSES.has(status)) {
      throw new AppError('Trạng thái đơn hàng không hợp lệ', 400);
    }

    where.push('o.status = ?');
    params.push(status);
  }

  if (query.search) {
    const keyword = `%${String(query.search).trim()}%`;
    where.push('(o.order_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR e.title LIKE ?)');
    params.push(keyword, keyword, keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN events e ON e.id = o.event_id
    ${whereSql}
    `,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT
      o.id,
      o.order_code AS orderCode,
      o.event_id AS eventId,
      e.title AS eventTitle,
      o.user_id AS userId,
      u.full_name AS userFullName,
      u.email AS userEmail,
      u.phone AS userPhone,
      o.status,
      o.total_amount AS totalAmount,
      o.expires_at AS expiresAt,
      o.paid_at AS paidAt,
      o.created_at AS createdAt,
      o.updated_at AS updatedAt,
      COUNT(oi.id) AS itemCount
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN events e ON e.id = o.event_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ${whereSql}
    GROUP BY
      o.id,
      o.order_code,
      o.event_id,
      e.title,
      o.user_id,
      u.full_name,
      u.email,
      u.phone,
      o.status,
      o.total_amount,
      o.expires_at,
      o.paid_at,
      o.created_at,
      o.updated_at
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const total = Number(countRows[0].total || 0);

  return {
    data: rows.map(formatOrder),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getOrder(orderIdInput) {
  await releaseExpiredLocks();
  const orderId = toPositiveInteger(orderIdInput, 'orderId');

  const [orders] = await pool.query(
    `
    SELECT
      o.id,
      o.order_code AS orderCode,
      o.event_id AS eventId,
      e.title AS eventTitle,
      o.user_id AS userId,
      u.full_name AS userFullName,
      u.email AS userEmail,
      u.phone AS userPhone,
      o.status,
      o.total_amount AS totalAmount,
      o.expires_at AS expiresAt,
      o.paid_at AS paidAt,
      o.created_at AS createdAt,
      o.updated_at AS updatedAt,
      COUNT(oi.id) AS itemCount
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN events e ON e.id = o.event_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ?
    GROUP BY
      o.id,
      o.order_code,
      o.event_id,
      e.title,
      o.user_id,
      u.full_name,
      u.email,
      u.phone,
      o.status,
      o.total_amount,
      o.expires_at,
      o.paid_at,
      o.created_at,
      o.updated_at
    LIMIT 1
    `,
    [orderId]
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
    [orderId]
  );

  return {
    order: formatOrder(orders[0]),
    items: items.map(formatOrderItem)
  };
}

function requiredString(value, fieldName) {
  const text = String(value || '').trim();
  if (!text) throw new AppError(`${fieldName} là bắt buộc`, 400);
  return text;
}

function optionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Thời gian không hợp lệ', 400);
  }
  return date;
}

function positiveInt(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} phải là số nguyên dương`, 400);
  }
  return parsed;
}

function positiveMoney(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} phải lớn hơn 0`, 400);
  }
  return parsed;
}

function pick(payload, camelKey, snakeKey) {
  return payload[camelKey] !== undefined ? payload[camelKey] : payload[snakeKey];
}

async function ensureEventExists(conn, eventId) {
  const [rows] = await conn.query('SELECT * FROM events WHERE id = ? LIMIT 1', [eventId]);
  if (!rows.length) throw new AppError('Không tìm thấy sự kiện', 404);
  return rows[0];
}

async function createEvent(adminId, payload) {
  const title = requiredString(payload.title, 'title');
  const location = requiredString(payload.location, 'location');
  const startTime = optionalDate(pick(payload, 'startTime', 'start_time'));
  const status = payload.status || 'DRAFT';
  if (!startTime) throw new AppError('startTime là bắt buộc', 400);
  if (!EVENT_STATUSES.has(status)) throw new AppError('Trạng thái sự kiện không hợp lệ', 400);

  const [result] = await pool.query(
    `
    INSERT INTO events
      (title, description, location, start_time, end_time, sale_start_time, sale_end_time, status, banner_url, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      payload.description || null,
      location,
      startTime,
      optionalDate(pick(payload, 'endTime', 'end_time')),
      optionalDate(pick(payload, 'saleStartTime', 'sale_start_time')),
      optionalDate(pick(payload, 'saleEndTime', 'sale_end_time')),
      status,
      pick(payload, 'bannerUrl', 'banner_url') || null,
      adminId
    ]
  );

  const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
  return formatEvent(rows[0]);
}

async function updateEvent(eventIdInput, payload) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const normalizedPayload = { ...payload };
  if (normalizedPayload.startTime === undefined && payload.start_time !== undefined) normalizedPayload.startTime = payload.start_time;
  if (normalizedPayload.endTime === undefined && payload.end_time !== undefined) normalizedPayload.endTime = payload.end_time;
  if (normalizedPayload.saleStartTime === undefined && payload.sale_start_time !== undefined) normalizedPayload.saleStartTime = payload.sale_start_time;
  if (normalizedPayload.saleEndTime === undefined && payload.sale_end_time !== undefined) normalizedPayload.saleEndTime = payload.sale_end_time;
  if (normalizedPayload.bannerUrl === undefined && payload.banner_url !== undefined) normalizedPayload.bannerUrl = payload.banner_url;
  const fields = [];
  const params = [];
  const mapping = {
    title: ['title', (value) => requiredString(value, 'title')],
    description: ['description', (value) => value || null],
    location: ['location', (value) => requiredString(value, 'location')],
    startTime: ['start_time', (value) => {
      const date = optionalDate(value);
      if (!date) throw new AppError('startTime là bắt buộc', 400);
      return date;
    }],
    endTime: ['end_time', optionalDate],
    saleStartTime: ['sale_start_time', optionalDate],
    saleEndTime: ['sale_end_time', optionalDate],
    status: ['status', (value) => {
      if (!EVENT_STATUSES.has(value)) throw new AppError('Trạng thái sự kiện không hợp lệ', 400);
      return value;
    }],
    bannerUrl: ['banner_url', (value) => value || null]
  };

  for (const [inputKey, [column, normalize]] of Object.entries(mapping)) {
    if (Object.prototype.hasOwnProperty.call(normalizedPayload, inputKey)) {
      fields.push(`${column} = ?`);
      params.push(normalize(normalizedPayload[inputKey]));
    }
  }

  if (!fields.length) {
    throw new AppError('Không có trường nào để cập nhật', 400);
  }

  const [result] = await pool.query(
    `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
    [...params, eventId]
  );

  if (!result.affectedRows) throw new AppError('Không tìm thấy sự kiện', 404);

  const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
  return formatEvent(rows[0]);
}

async function deleteEvent(eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const [orderRows] = await pool.query('SELECT COUNT(*) AS total FROM orders WHERE event_id = ?', [eventId]);
  if (Number(orderRows[0].total || 0) > 0) {
    throw new AppError('Không thể xoá sự kiện đã có đơn hàng', 409);
  }

  const [result] = await pool.query('DELETE FROM events WHERE id = ?', [eventId]);
  if (!result.affectedRows) throw new AppError('Không tìm thấy sự kiện', 404);
  return { success: true };
}

async function publishEvent(eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const [result] = await pool.query(
    "UPDATE events SET status = 'PUBLISHED' WHERE id = ?",
    [eventId]
  );
  if (!result.affectedRows) throw new AppError('Không tìm thấy sự kiện', 404);

  const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
  return formatEvent(rows[0]);
}

async function createZone(eventIdInput, payload) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await ensureEventExists(conn, eventId);

    const [result] = await conn.query(
      `
      INSERT INTO seat_zones (event_id, name, row_count, seats_per_row, price, color)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        eventId,
        requiredString(payload.name, 'name'),
        positiveInt(pick(payload, 'rowCount', 'row_count'), 'rowCount'),
        positiveInt(pick(payload, 'seatsPerRow', 'seats_per_row'), 'seatsPerRow'),
        positiveMoney(payload.price, 'price'),
        payload.color || null
      ]
    );

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM seat_zones WHERE id = ?', [result.insertId]);
    return formatZone(rows[0]);
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError('Tên khu ghế đã tồn tại trong sự kiện', 409);
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function listZones(eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const [rows] = await pool.query(
    'SELECT * FROM seat_zones WHERE event_id = ? ORDER BY id ASC',
    [eventId]
  );

  return rows.map(formatZone);
}

async function generateSeats(eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await ensureEventExists(conn, eventId);

    const [zones] = await conn.query(
      'SELECT * FROM seat_zones WHERE event_id = ? ORDER BY id ASC FOR UPDATE',
      [eventId]
    );
    if (!zones.length) {
      throw new AppError('Sự kiện chưa có khu ghế', 409);
    }

    const [existingSeats] = await conn.query(
      'SELECT COUNT(*) AS total FROM seats WHERE event_id = ?',
      [eventId]
    );
    if (Number(existingSeats[0].total || 0) > 0) {
      throw new AppError('Sự kiện đã được generate ghế trước đó', 409);
    }

    const values = [];
    for (const zone of zones) {
      for (let row = 1; row <= zone.row_count; row += 1) {
        const rowLabel = `R${row}`;
        for (let seat = 1; seat <= zone.seats_per_row; seat += 1) {
          values.push([
            eventId,
            zone.id,
            rowLabel,
            seat,
            `${zone.name}-${rowLabel}-S${seat}`
          ]);
        }
      }
    }

    for (let index = 0; index < values.length; index += 1000) {
      await conn.query(
        `
        INSERT INTO seats (event_id, zone_id, row_label, seat_number, seat_code)
        VALUES ?
        `,
        [values.slice(index, index + 1000)]
      );
    }

    await conn.commit();
    return { generatedSeats: values.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getDashboard(eventIdInput) {
  await releaseExpiredLocks();
  const eventId = toPositiveInteger(eventIdInput, 'eventId');

  const [statsRows] = await pool.query(
    `
    SELECT
      COUNT(*) AS totalSeats,
      COALESCE(SUM(status = 'SOLD'), 0) AS soldSeats,
      COALESCE(SUM(status = 'LOCKED'), 0) AS lockedSeats,
      COALESCE(SUM(status = 'AVAILABLE'), 0) AS availableSeats
    FROM seats
    WHERE event_id = ?
    `,
    [eventId]
  );
  const [revenueRows] = await pool.query(
    `
    SELECT COALESCE(SUM(total_amount), 0) AS revenue
    FROM orders
    WHERE event_id = ?
      AND status = 'PAID'
    `,
    [eventId]
  );

  return {
    revenue: Number(revenueRows[0].revenue || 0),
    ...formatStats(statsRows[0])
  };
}

async function getAudienceStatistics(eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');

  const [genderRows] = await pool.query(
    `
    SELECT COALESCE(u.gender, 'UNKNOWN') AS gender, COUNT(DISTINCT o.user_id) AS total
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.event_id = ?
      AND o.status = 'PAID'
    GROUP BY COALESCE(u.gender, 'UNKNOWN')
    `,
    [eventId]
  );

  const [ageRows] = await pool.query(
    `
    SELECT
      CASE
        WHEN u.date_of_birth IS NULL THEN 'UNKNOWN'
        WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) < 18 THEN '<18'
        WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 18 AND 24 THEN '18-24'
        WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 25 AND 34 THEN '25-34'
        WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 35 AND 44 THEN '35-44'
        ELSE '45+'
      END AS ageGroup,
      COUNT(DISTINCT o.user_id) AS total
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.event_id = ?
      AND o.status = 'PAID'
    GROUP BY ageGroup
    `,
    [eventId]
  );

  return {
    gender: genderRows.map((row) => ({ gender: row.gender, total: Number(row.total || 0) })),
    age: ageRows.map((row) => ({ ageGroup: row.ageGroup, total: Number(row.total || 0) }))
  };
}

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  createZone,
  listZones,
  generateSeats,
  getDashboard,
  getAudienceStatistics,
  listOrders,
  getOrder
};
