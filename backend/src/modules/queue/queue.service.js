const pool = require('../../config/database');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const { toPositiveInteger } = require('../../utils/ids');
const { generateQueueToken } = require('../../utils/generateCode');

function formatQueueEntry(row, extra = {}) {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    queueToken: row.queue_token,
    status: row.status,
    positionNumber: row.position_number,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    ...extra
  };
}

async function ensureEventExists(conn, eventId) {
  const [events] = await conn.query('SELECT id FROM events WHERE id = ? LIMIT 1 FOR UPDATE', [eventId]);
  if (!events.length) {
    throw new AppError('Không tìm thấy sự kiện', 404);
  }
}

async function expireQueueEntries(existingConn = null, eventId = null) {
  const conn = existingConn || await pool.getConnection();
  const params = [];
  let eventSql = '';

  if (eventId) {
    eventSql = 'AND event_id = ?';
    params.push(eventId);
  }

  try {
    await conn.query(
      `
      UPDATE queue_entries
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE'
        AND expires_at < NOW()
        ${eventSql}
      `,
      params
    );
  } finally {
    if (!existingConn) conn.release();
  }
}

async function nextPosition(conn, eventId) {
  const [rows] = await conn.query(
    `
    SELECT position_number
    FROM queue_entries
    WHERE event_id = ?
    ORDER BY position_number DESC
    LIMIT 1
    FOR UPDATE
    `,
    [eventId]
  );

  return rows.length ? Number(rows[0].position_number) + 1 : 1;
}

async function joinQueue(userId, eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await ensureEventExists(conn, eventId);
    await expireQueueEntries(conn, eventId);

    const [existingRows] = await conn.query(
      `
      SELECT *
      FROM queue_entries
      WHERE event_id = ?
        AND user_id = ?
      FOR UPDATE
      `,
      [eventId, userId]
    );

    const existing = existingRows[0];
    if (existing && ['WAITING', 'ACTIVE'].includes(existing.status)) {
      await conn.commit();
      return getQueueStatus(userId, eventId);
    }

    const positionNumber = await nextPosition(conn, eventId);
    const queueToken = generateQueueToken();

    if (existing) {
      await conn.query(
        `
        UPDATE queue_entries
        SET queue_token = ?,
            status = 'WAITING',
            position_number = ?,
            activated_at = NULL,
            expires_at = NULL
        WHERE id = ?
        `,
        [queueToken, positionNumber, existing.id]
      );
    } else {
      await conn.query(
        `
        INSERT INTO queue_entries (event_id, user_id, queue_token, status, position_number)
        VALUES (?, ?, ?, 'WAITING', ?)
        `,
        [eventId, userId, queueToken, positionNumber]
      );
    }

    await conn.commit();
    return getQueueStatus(userId, eventId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getQueueStatus(userId, eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');
  await expireQueueEntries(null, eventId);

  const [rows] = await pool.query(
    `
    SELECT *
    FROM queue_entries
    WHERE event_id = ?
      AND user_id = ?
    LIMIT 1
    `,
    [eventId, userId]
  );

  if (!rows.length) {
    return {
      status: 'NOT_JOINED',
      canEnter: !env.queue.enabled
    };
  }

  const entry = rows[0];
  if (entry.status === 'ACTIVE') {
    return formatQueueEntry(entry, {
      canEnter: true,
      position: 0,
      peopleAhead: 0
    });
  }

  if (entry.status === 'WAITING') {
    const [aheadRows] = await pool.query(
      `
      SELECT COUNT(*) AS peopleAhead
      FROM queue_entries
      WHERE event_id = ?
        AND status = 'WAITING'
        AND position_number < ?
      `,
      [eventId, entry.position_number]
    );

    const peopleAhead = Number(aheadRows[0].peopleAhead || 0);
    return formatQueueEntry(entry, {
      canEnter: false,
      position: peopleAhead + 1,
      peopleAhead
    });
  }

  return formatQueueEntry(entry, {
    canEnter: false,
    position: null,
    peopleAhead: null
  });
}

async function leaveQueue(userId, eventIdInput) {
  const eventId = toPositiveInteger(eventIdInput, 'eventId');

  const [result] = await pool.query(
    `
    UPDATE queue_entries
    SET status = 'DONE'
    WHERE event_id = ?
      AND user_id = ?
      AND status IN ('WAITING', 'ACTIVE')
    `,
    [eventId, userId]
  );

  return {
    success: result.affectedRows > 0
  };
}

async function activateQueueForEvent(eventId) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await expireQueueEntries(conn, eventId);

    const [activeRows] = await conn.query(
      `
      SELECT id
      FROM queue_entries
      WHERE event_id = ?
        AND status = 'ACTIVE'
      FOR UPDATE
      `,
      [eventId]
    );

    const availableSlots = Math.max(env.queue.activeBatchSize - activeRows.length, 0);
    if (!availableSlots) {
      await conn.commit();
      return 0;
    }

    const [waitingRows] = await conn.query(
      `
      SELECT id
      FROM queue_entries
      WHERE event_id = ?
        AND status = 'WAITING'
      ORDER BY position_number ASC
      LIMIT ${availableSlots}
      FOR UPDATE
      `,
      [eventId]
    );

    if (!waitingRows.length) {
      await conn.commit();
      return 0;
    }

    await conn.query(
      `
      UPDATE queue_entries
      SET status = 'ACTIVE',
          activated_at = NOW(),
          expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
      WHERE id IN (?)
      `,
      [env.queue.activeMinutes, waitingRows.map((row) => row.id)]
    );

    await conn.commit();
    return waitingRows.length;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function activateQueues() {
  await expireQueueEntries();

  const [events] = await pool.query(
    `
    SELECT DISTINCT event_id
    FROM queue_entries
    WHERE status = 'WAITING'
    `
  );

  let activated = 0;
  for (const event of events) {
    activated += await activateQueueForEvent(event.event_id);
  }

  return { activated };
}

module.exports = {
  formatQueueEntry,
  expireQueueEntries,
  joinQueue,
  getQueueStatus,
  leaveQueue,
  activateQueues
};
