const pool = require('../../config/database');
const { AppError } = require('../../utils/errors');
const { toPositiveInteger } = require('../../utils/ids');
const { releaseExpiredLocks } = require('../orders/order.service');

const EVENT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'CANCELLED', 'FINISHED']);

function formatEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startTime: row.start_time,
    endTime: row.end_time,
    saleStartTime: row.sale_start_time,
    saleEndTime: row.sale_end_time,
    status: row.status,
    bannerUrl: row.banner_url,
    seatingChart: row.seating_chart,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatStats(row = {}) {
  const totalSeats = Number(row.totalSeats || 0);
  const soldSeats = Number(row.soldSeats || 0);

  return {
    totalSeats,
    availableSeats: Number(row.availableSeats || 0),
    lockedSeats: Number(row.lockedSeats || 0),
    soldSeats,
    occupancyRate: totalSeats ? Number(((soldSeats / totalSeats) * 100).toFixed(2)) : 0
  };
}

function formatZone(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    rowCount: row.row_count,
    seatsPerRow: row.seats_per_row,
    price: Number(row.price),
    color: row.color,
    createdAt: row.created_at
  };
}

async function listEvents({ keyword, status = 'PUBLISHED', limit = 20, page = 1 }) {
  await releaseExpiredLocks();

  const where = [];
  const params = [];
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const requestedStatus = status || 'PUBLISHED';

  if (requestedStatus) {
    if (!EVENT_STATUSES.has(requestedStatus)) {
      throw new AppError('Trạng thái sự kiện không hợp lệ', 400);
    }
    where.push('e.status = ?');
    params.push(requestedStatus);
  }

  if (keyword) {
    where.push('(e.title LIKE ? OR e.location LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `
    SELECT
      e.*,
      COUNT(s.id) AS totalSeats,
      COALESCE(SUM(s.status = 'AVAILABLE'), 0) AS availableSeats,
      COALESCE(SUM(s.status = 'LOCKED'), 0) AS lockedSeats,
      COALESCE(SUM(s.status = 'SOLD'), 0) AS soldSeats
    FROM events e
    LEFT JOIN seats s ON s.event_id = e.id
    ${whereSql}
    GROUP BY e.id
    ORDER BY e.start_time ASC, e.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, (safePage - 1) * safeLimit]
  );

  return {
    data: rows.map((row) => ({
      ...formatEvent(row),
      stats: formatStats(row)
    })),
    pagination: {
      page: safePage,
      limit: safeLimit
    }
  };
}

async function getEventById(eventId) {
  await releaseExpiredLocks();
  const id = toPositiveInteger(eventId, 'eventId');

  const [events] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
  if (!events.length) {
    throw new AppError('Không tìm thấy sự kiện', 404);
  }

  const [zones] = await pool.query(
    'SELECT * FROM seat_zones WHERE event_id = ? ORDER BY id ASC',
    [id]
  );
  const [statsRows] = await pool.query(
    `
    SELECT
      COUNT(*) AS totalSeats,
      COALESCE(SUM(status = 'AVAILABLE'), 0) AS availableSeats,
      COALESCE(SUM(status = 'LOCKED'), 0) AS lockedSeats,
      COALESCE(SUM(status = 'SOLD'), 0) AS soldSeats
    FROM seats
    WHERE event_id = ?
    `,
    [id]
  );

  return {
    event: formatEvent(events[0]),
    zones: zones.map(formatZone),
    stats: formatStats(statsRows[0])
  };
}

async function getSeatMap(eventId) {
  await releaseExpiredLocks();
  const id = toPositiveInteger(eventId, 'eventId');

  const [events] = await pool.query(
    'SELECT id, title, status, location, start_time, seating_chart FROM events WHERE id = ? LIMIT 1',
    [id]
  );
  if (!events.length) {
    throw new AppError('Không tìm thấy sự kiện', 404);
  }

  const [zones] = await pool.query(
    'SELECT * FROM seat_zones WHERE event_id = ? ORDER BY id ASC',
    [id]
  );
  const [seats] = await pool.query(
    `
    SELECT id, zone_id, row_label, seat_number, seat_code, status, locked_until
    FROM seats
    WHERE event_id = ?
    ORDER BY zone_id ASC, CAST(SUBSTRING(row_label, 2) AS UNSIGNED) ASC, seat_number ASC
    `,
    [id]
  );

  const seatsByZone = new Map();
  for (const seat of seats) {
    if (!seatsByZone.has(seat.zone_id)) seatsByZone.set(seat.zone_id, new Map());
    const rows = seatsByZone.get(seat.zone_id);
    if (!rows.has(seat.row_label)) rows.set(seat.row_label, []);
    rows.get(seat.row_label).push({
      id: seat.id,
      seatCode: seat.seat_code,
      seatNumber: seat.seat_number,
      status: seat.status,
      lockedUntil: seat.locked_until
    });
  }

  return {
    event: {
      id: events[0].id,
      title: events[0].title,
      status: events[0].status,
      location: events[0].location,
      startTime: events[0].start_time,
      seatingChart: events[0].seating_chart
    },
    zones: zones.map((zone) => {
      const rows = seatsByZone.get(zone.id) || new Map();
      return {
        id: zone.id,
        name: zone.name,
        price: Number(zone.price),
        color: zone.color,
        rowCount: zone.row_count,
        seatsPerRow: zone.seats_per_row,
        rows: Array.from(rows.entries()).map(([rowLabel, rowSeats]) => ({
          rowLabel,
          seats: rowSeats
        }))
      };
    })
  };
}

module.exports = {
  EVENT_STATUSES,
  formatEvent,
  formatStats,
  formatZone,
  listEvents,
  getEventById,
  getSeatMap
};
