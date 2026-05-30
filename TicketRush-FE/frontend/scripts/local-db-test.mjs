import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const MINUTE = 60 * 1000;

const clone = (value) => JSON.parse(JSON.stringify(value));
const iso = (date) => date.toISOString();
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * MINUTE);
const roundMoney = (value) => Math.round(value * 100) / 100;

const makeCounter = (start = 1) => {
  let value = start;
  return () => value++;
};

const buildSeed = () => {
  const nextUser = makeCounter(3);
  const nextEvent = makeCounter(2);
  const nextZone = makeCounter(3);
  const nextSeat = makeCounter(1);
  const nextQueue = makeCounter(1);
  const nextOrder = makeCounter(1);
  const nextOrderItem = makeCounter(1);
  const nextLockLog = makeCounter(1);

  const now = new Date();
  const counters = {
    user: () => `user_${String(nextUser()).padStart(4, '0')}`,
    event: () => `event_${String(nextEvent()).padStart(4, '0')}`,
    zone: () => `zone_${String(nextZone()).padStart(4, '0')}`,
    seat: () => `seat_${String(nextSeat()).padStart(5, '0')}`,
    queue: () => `queue_${String(nextQueue()).padStart(5, '0')}`,
    order: () => `order_${String(nextOrder()).padStart(5, '0')}`,
    orderItem: () => `item_${String(nextOrderItem()).padStart(5, '0')}`,
    lockLog: () => `lock_${String(nextLockLog()).padStart(5, '0')}`,
  };

  const db = {
    counters,
    users: [
      {
        id: 'user_0001',
        fullName: 'Admin TicketRush',
        email: 'admin@ticketrush.local',
        password: 'Admin@123456',
        phone: '0900000001',
        gender: 'OTHER',
        dateOfBirth: '1995-01-01',
        role: 'ADMIN',
        isEmailVerified: true,
        createdAt: iso(now),
        updatedAt: iso(now),
      },
      {
        id: 'user_0002',
        fullName: 'Customer Demo',
        email: 'customer@ticketrush.local',
        password: 'Customer@123456',
        phone: '0900000002',
        gender: 'OTHER',
        dateOfBirth: '1998-03-15',
        role: 'CUSTOMER',
        isEmailVerified: true,
        createdAt: iso(now),
        updatedAt: iso(now),
      },
    ],
    events: [
      {
        id: 'event_0001',
        title: 'TicketRush Live Demo',
        description: 'Seed event used to test customer booking flows.',
        location: 'Ho Chi Minh City',
        imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
        startTime: iso(addMinutes(now, 60 * 24 * 14)),
        endTime: iso(addMinutes(now, 60 * 24 * 14 + 180)),
        status: 'PUBLISHED',
        requiresQueue: true,
        createdBy: 'user_0001',
        createdAt: iso(now),
        updatedAt: iso(now),
      },
    ],
    seat_zones: [
      {
        id: 'zone_0001',
        eventId: 'event_0001',
        name: 'VIP',
        price: 2500000,
        totalSeats: 8,
        color: '#d946ef',
        rowLabels: ['A', 'B'],
        seatsPerRow: 4,
        createdAt: iso(now),
        updatedAt: iso(now),
      },
      {
        id: 'zone_0002',
        eventId: 'event_0001',
        name: 'Standard',
        price: 900000,
        totalSeats: 10,
        color: '#06b6d4',
        rowLabels: ['C', 'D'],
        seatsPerRow: 5,
        createdAt: iso(now),
        updatedAt: iso(now),
      },
    ],
    seats: [],
    queue_entries: [],
    orders: [],
    order_items: [],
    seat_lock_logs: [],
  };

  for (const zone of db.seat_zones) {
    for (const row of zone.rowLabels) {
      for (let number = 1; number <= zone.seatsPerRow; number += 1) {
        db.seats.push({
          id: counters.seat(),
          zoneId: zone.id,
          eventId: zone.eventId,
          rowLabel: row,
          seatNumber: String(number),
          status: 'AVAILABLE',
          lockedByUserId: null,
          lockedUntil: null,
          createdAt: iso(now),
          updatedAt: iso(now),
        });
      }
    }
  }

  return db;
};

class LocalTicketRushDb {
  constructor(seed = buildSeed()) {
    this.db = seed;
  }

  health() {
    return { ok: true, source: 'local-db-test', checkedAt: iso(new Date()) };
  }

  login(email, password) {
    const user = this.db.users.find((item) => item.email === email);
    assert(user, `Missing user: ${email}`);
    assert.equal(user.password, password, 'Invalid password');

    return {
      accessToken: `local-token:${user.id}`,
      user: this.toPublicUser(user),
    };
  }

  register(payload) {
    const duplicate = this.db.users.some((user) => user.email === payload.email);
    assert.equal(duplicate, false, `Email already exists: ${payload.email}`);

    const now = iso(new Date());
    const user = {
      id: this.db.counters.user(),
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone ?? '',
      gender: payload.gender ?? 'OTHER',
      dateOfBirth: payload.dateOfBirth ?? null,
      role: 'CUSTOMER',
      isEmailVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.users.push(user);
    return this.login(payload.email, payload.password);
  }

  me(token) {
    const userId = String(token).replace('local-token:', '');
    return this.toPublicUser(this.requireUser(userId));
  }

  listEvents(status = 'PUBLISHED') {
    return this.db.events
      .filter((event) => !status || event.status === status)
      .map((event) => this.toEventDto(event));
  }

  getEvent(eventId) {
    return this.toEventDto(this.requireEvent(eventId));
  }

  getSeatMap(eventId) {
    this.releaseExpiredLocks();
    this.requireEvent(eventId);

    const zones = this.db.seat_zones
      .filter((zone) => zone.eventId === eventId)
      .map((zone) => ({
        id: zone.id,
        eventId: zone.eventId,
        name: zone.name,
        price: zone.price,
        totalSeats: zone.totalSeats,
        color: zone.color,
        seats: this.db.seats
          .filter((seat) => seat.zoneId === zone.id)
          .sort((a, b) => a.rowLabel.localeCompare(b.rowLabel) || Number(a.seatNumber) - Number(b.seatNumber))
          .map((seat) => ({ ...seat, price: zone.price })),
      }));

    return {
      eventId,
      zones,
      totals: this.getEventStats(eventId),
    };
  }

  joinQueue(userId, eventId) {
    this.requireUser(userId);
    this.requireEvent(eventId);

    const existing = this.db.queue_entries.find(
      (entry) => entry.userId === userId && entry.eventId === eventId && ['WAITING', 'ACTIVE'].includes(entry.status),
    );

    if (existing) {
      return clone(existing);
    }

    const waitingAhead = this.db.queue_entries.filter(
      (entry) => entry.eventId === eventId && entry.status === 'WAITING',
    ).length;
    const now = iso(new Date());
    const entry = {
      id: this.db.counters.queue(),
      userId,
      eventId,
      position: waitingAhead + 1,
      status: 'WAITING',
      activatedAt: null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db.queue_entries.push(entry);
    return clone(entry);
  }

  activateQueue(userId, eventId, activeMinutes = 10) {
    const entry = this.db.queue_entries.find(
      (item) => item.userId === userId && item.eventId === eventId && item.status === 'WAITING',
    );
    assert(entry, 'No waiting queue entry to activate');

    const now = new Date();
    entry.status = 'ACTIVE';
    entry.position = 0;
    entry.activatedAt = iso(now);
    entry.expiresAt = iso(addMinutes(now, activeMinutes));
    entry.updatedAt = iso(now);

    for (const waiting of this.db.queue_entries.filter((item) => item.eventId === eventId && item.status === 'WAITING')) {
      waiting.position = Math.max(1, waiting.position - 1);
      waiting.updatedAt = iso(now);
    }

    return clone(entry);
  }

  getQueueStatus(userId, eventId) {
    const entry = this.db.queue_entries.find(
      (item) => item.userId === userId && item.eventId === eventId && ['WAITING', 'ACTIVE'].includes(item.status),
    );

    return entry ? clone(entry) : null;
  }

  leaveQueue(userId, eventId) {
    const entry = this.db.queue_entries.find(
      (item) => item.userId === userId && item.eventId === eventId && ['WAITING', 'ACTIVE'].includes(item.status),
    );

    if (!entry) {
      return null;
    }

    const now = iso(new Date());
    entry.status = 'LEFT';
    entry.updatedAt = now;

    return clone(entry);
  }

  lockSeats(userId, eventId, seatIds) {
    this.releaseExpiredLocks();
    this.requireUser(userId);
    const event = this.requireEvent(eventId);

    if (event.requiresQueue) {
      const queue = this.getQueueStatus(userId, eventId);
      assert(queue?.status === 'ACTIVE', 'QUEUE_REQUIRED');
    }

    assert(seatIds.length > 0, 'No seats selected');

    const selectedSeats = seatIds.map((seatId) => this.requireSeat(seatId));
    for (const seat of selectedSeats) {
      assert.equal(seat.eventId, eventId, `Seat does not belong to event: ${seat.id}`);
      assert.equal(seat.status, 'AVAILABLE', `Seat is not available: ${seat.id}`);
    }

    const now = new Date();
    const lockedUntil = iso(addMinutes(now, 10));
    const totalAmount = selectedSeats.reduce((sum, seat) => sum + this.requireZone(seat.zoneId).price, 0);
    const order = {
      id: this.db.counters.order(),
      userId,
      eventId,
      status: 'PENDING',
      totalAmount: roundMoney(totalAmount),
      paymentMethod: null,
      paymentStatus: 'PENDING',
      paymentDeadline: lockedUntil,
      paidAt: null,
      createdAt: iso(now),
      updatedAt: iso(now),
    };

    this.db.orders.push(order);

    const orderItems = selectedSeats.map((seat) => {
      const zone = this.requireZone(seat.zoneId);
      seat.status = 'LOCKED';
      seat.lockedByUserId = userId;
      seat.lockedUntil = lockedUntil;
      seat.updatedAt = iso(now);

      const item = {
        id: this.db.counters.orderItem(),
        orderId: order.id,
        seatId: seat.id,
        price: zone.price,
        createdAt: iso(now),
      };
      this.db.order_items.push(item);

      this.db.seat_lock_logs.push({
        id: this.db.counters.lockLog(),
        seatId: seat.id,
        userId,
        orderId: order.id,
        action: 'LOCKED',
        expiresAt: lockedUntil,
        createdAt: iso(now),
      });

      return item;
    });

    return {
      order: clone(order),
      orderItems: clone(orderItems),
      seats: clone(selectedSeats),
    };
  }

  confirmPayment(userId, orderId, paymentMethod = 'MOMO') {
    const order = this.requireOrder(orderId);
    assert.equal(order.userId, userId, 'Order does not belong to this user');
    assert.equal(order.status, 'PENDING', `Order is not pending: ${order.status}`);

    const now = iso(new Date());
    const items = this.db.order_items.filter((item) => item.orderId === orderId);
    assert(items.length > 0, 'Order has no items');

    for (const item of items) {
      const seat = this.requireSeat(item.seatId);
      assert.equal(seat.status, 'LOCKED', `Seat is not locked: ${seat.id}`);
      assert.equal(seat.lockedByUserId, userId, `Seat lock belongs to another user: ${seat.id}`);
      seat.status = 'SOLD';
      seat.lockedByUserId = null;
      seat.lockedUntil = null;
      seat.updatedAt = now;

      this.db.seat_lock_logs.push({
        id: this.db.counters.lockLog(),
        seatId: seat.id,
        userId,
        orderId,
        action: 'SOLD',
        expiresAt: null,
        createdAt: now,
      });
    }

    order.status = 'PAID';
    order.paymentMethod = paymentMethod;
    order.paymentStatus = 'PAID';
    order.paidAt = now;
    order.updatedAt = now;

    return this.toOrderDto(order);
  }

  cancelHold(userId, orderId) {
    this.releaseExpiredLocks();
    const order = this.requireOrder(orderId);
    assert.equal(order.userId, userId, 'Order does not belong to this user');
    assert.equal(order.status, 'PENDING', `Order is not pending: ${order.status}`);

    const now = iso(new Date());
    const items = this.db.order_items.filter((item) => item.orderId === orderId);
    assert(items.length > 0, 'Order has no items');

    for (const item of items) {
      const seat = this.requireSeat(item.seatId);
      assert.equal(seat.status, 'LOCKED', `Seat is not locked: ${seat.id}`);
      assert.equal(seat.lockedByUserId, userId, `Seat lock belongs to another user: ${seat.id}`);
      seat.status = 'AVAILABLE';
      seat.lockedByUserId = null;
      seat.lockedUntil = null;
      seat.updatedAt = now;

      this.db.seat_lock_logs.push({
        id: this.db.counters.lockLog(),
        seatId: seat.id,
        userId,
        orderId,
        action: 'RELEASED',
        expiresAt: null,
        createdAt: now,
      });
    }

    order.status = 'CANCELLED';
    order.paymentStatus = 'CANCELLED';
    order.paymentDeadline = null;
    order.updatedAt = now;

    return this.toOrderDto(order);
  }

  listOrders(userId) {
    this.requireUser(userId);
    return this.db.orders
      .filter((order) => order.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => this.toOrderDto(order));
  }

  getOrder(userId, orderId) {
    const order = this.requireOrder(orderId);
    assert.equal(order.userId, userId, 'Order does not belong to this user');
    return this.toOrderDto(order);
  }

  createEvent(adminId, payload) {
    this.requireAdmin(adminId);

    const now = iso(new Date());
    const event = {
      id: this.db.counters.event(),
      title: payload.title,
      description: payload.description ?? '',
      location: payload.location,
      imageUrl: payload.imageUrl ?? '',
      startTime: payload.startTime,
      endTime: payload.endTime,
      status: payload.status ?? 'DRAFT',
      requiresQueue: Boolean(payload.requiresQueue),
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    };

    this.db.events.push(event);
    return this.toEventDto(event);
  }

  createZone(adminId, eventId, payload) {
    this.requireAdmin(adminId);
    this.requireEvent(eventId);

    const now = iso(new Date());
    const zone = {
      id: this.db.counters.zone(),
      eventId,
      name: payload.name,
      price: Number(payload.price),
      totalSeats: 0,
      color: payload.color ?? '#22c55e',
      rowLabels: payload.rowLabels ?? ['A'],
      seatsPerRow: Number(payload.seatsPerRow ?? 10),
      createdAt: now,
      updatedAt: now,
    };

    this.db.seat_zones.push(zone);
    return clone(zone);
  }

  generateSeats(adminId, eventId) {
    this.requireAdmin(adminId);
    this.requireEvent(eventId);

    const zones = this.db.seat_zones.filter((zone) => zone.eventId === eventId);
    assert(zones.length > 0, 'Event has no zones');

    const now = iso(new Date());
    const createdSeats = [];

    for (const zone of zones) {
      const existing = this.db.seats.some((seat) => seat.zoneId === zone.id);
      if (existing) {
        continue;
      }

      for (const row of zone.rowLabels) {
        for (let number = 1; number <= zone.seatsPerRow; number += 1) {
          const seat = {
            id: this.db.counters.seat(),
            zoneId: zone.id,
            eventId,
            rowLabel: row,
            seatNumber: String(number),
            status: 'AVAILABLE',
            lockedByUserId: null,
            lockedUntil: null,
            createdAt: now,
            updatedAt: now,
          };
          this.db.seats.push(seat);
          createdSeats.push(seat);
        }
      }

      zone.totalSeats = zone.rowLabels.length * zone.seatsPerRow;
      zone.updatedAt = now;
    }

    return clone(createdSeats);
  }

  getDashboard(eventId) {
    this.requireEvent(eventId);
    const stats = this.getEventStats(eventId);
    const paidOrders = this.db.orders.filter((order) => order.eventId === eventId && order.status === 'PAID');
    const pendingOrders = this.db.orders.filter((order) => order.eventId === eventId && order.status === 'PENDING');

    return {
      eventId,
      totalSeats: stats.totalSeats,
      availableSeats: stats.availableSeats,
      soldSeats: stats.soldSeats,
      lockedSeats: stats.lockedSeats,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      revenue: stats.revenue,
    };
  }

  snapshot() {
    const { counters, ...tables } = this.db;
    return clone(tables);
  }

  releaseExpiredLocks(now = new Date()) {
    const expiredSeats = this.db.seats.filter(
      (seat) => seat.status === 'LOCKED' && seat.lockedUntil && new Date(seat.lockedUntil) <= now,
    );

    if (expiredSeats.length === 0) {
      return;
    }

    const updatedAt = iso(now);
    for (const seat of expiredSeats) {
      const pendingItems = this.db.order_items.filter((item) => item.seatId === seat.id);
      const pendingOrder = pendingItems
        .map((item) => this.db.orders.find((order) => order.id === item.orderId))
        .find((order) => order?.status === 'PENDING');

      if (pendingOrder) {
        pendingOrder.status = 'EXPIRED';
        pendingOrder.paymentStatus = 'EXPIRED';
        pendingOrder.updatedAt = updatedAt;
      }

      seat.status = 'AVAILABLE';
      seat.lockedByUserId = null;
      seat.lockedUntil = null;
      seat.updatedAt = updatedAt;

      this.db.seat_lock_logs.push({
        id: this.db.counters.lockLog(),
        seatId: seat.id,
        userId: pendingOrder?.userId ?? null,
        orderId: pendingOrder?.id ?? null,
        action: 'RELEASED',
        expiresAt: null,
        createdAt: updatedAt,
      });
    }
  }

  getEventStats(eventId) {
    const seats = this.db.seats.filter((seat) => seat.eventId === eventId);
    const zones = this.db.seat_zones.filter((zone) => zone.eventId === eventId);
    const paidOrders = this.db.orders.filter((order) => order.eventId === eventId && order.status === 'PAID');

    return {
      totalSeats: seats.length,
      availableSeats: seats.filter((seat) => seat.status === 'AVAILABLE').length,
      lockedSeats: seats.filter((seat) => seat.status === 'LOCKED').length,
      soldSeats: seats.filter((seat) => seat.status === 'SOLD').length,
      minPrice: zones.length ? Math.min(...zones.map((zone) => zone.price)) : 0,
      maxPrice: zones.length ? Math.max(...zones.map((zone) => zone.price)) : 0,
      revenue: paidOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    };
  }

  toEventDto(event) {
    return {
      ...clone(event),
      stats: this.getEventStats(event.id),
      zones: this.db.seat_zones.filter((zone) => zone.eventId === event.id).map((zone) => clone(zone)),
    };
  }

  toOrderDto(order) {
    const items = this.db.order_items
      .filter((item) => item.orderId === order.id)
      .map((item) => {
        const seat = this.requireSeat(item.seatId);
        const zone = this.requireZone(seat.zoneId);
        return {
          ...clone(item),
          seat: clone(seat),
          zone: clone(zone),
        };
      });

    return {
      ...clone(order),
      event: this.getEvent(order.eventId),
      items,
    };
  }

  toPublicUser(user) {
    const { password, ...publicUser } = user;
    return clone(publicUser);
  }

  requireAdmin(userId) {
    const user = this.requireUser(userId);
    assert.equal(user.role, 'ADMIN', 'Admin role required');
    return user;
  }

  requireUser(userId) {
    const user = this.db.users.find((item) => item.id === userId);
    assert(user, `Missing user: ${userId}`);
    return user;
  }

  requireEvent(eventId) {
    const event = this.db.events.find((item) => item.id === eventId);
    assert(event, `Missing event: ${eventId}`);
    return event;
  }

  requireZone(zoneId) {
    const zone = this.db.seat_zones.find((item) => item.id === zoneId);
    assert(zone, `Missing zone: ${zoneId}`);
    return zone;
  }

  requireSeat(seatId) {
    const seat = this.db.seats.find((item) => item.id === seatId);
    assert(seat, `Missing seat: ${seatId}`);
    return seat;
  }

  requireOrder(orderId) {
    const order = this.db.orders.find((item) => item.id === orderId);
    assert(order, `Missing order: ${orderId}`);
    return order;
  }
}

export const createLocalTicketRushDb = () => new LocalTicketRushDb();

export const runLocalDbSmokeTest = () => {
  const db = createLocalTicketRushDb();
  const messages = [];
  const pass = (message) => messages.push(message);

  assert.equal(db.health().ok, true);
  pass('health check returns ok');

  const customerAuth = db.login('customer@ticketrush.local', 'Customer@123456');
  assert.equal(customerAuth.user.role, 'CUSTOMER');
  pass('customer can login');

  const registered = db.register({
    fullName: 'New Buyer',
    email: 'new.buyer@ticketrush.local',
    password: 'Buyer@123456',
    phone: '0900000003',
  });
  assert.equal(registered.user.email, 'new.buyer@ticketrush.local');
  pass('customer can register');

  const events = db.listEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].stats.totalSeats, 18);
  pass('published events include seat statistics');

  const event = events[0];
  const seatMap = db.getSeatMap(event.id);
  const selectedSeats = seatMap.zones
    .flatMap((zone) => zone.seats)
    .filter((seat) => seat.status === 'AVAILABLE')
    .slice(0, 2)
    .map((seat) => seat.id);
  assert.equal(selectedSeats.length, 2);
  pass('seat map returns available seats');

  const queue = db.joinQueue(customerAuth.user.id, event.id);
  assert.equal(queue.status, 'WAITING');
  const activeQueue = db.activateQueue(customerAuth.user.id, event.id);
  assert.equal(activeQueue.status, 'ACTIVE');
  pass('queue can move customer from waiting to active');

  const hold = db.lockSeats(customerAuth.user.id, event.id, selectedSeats);
  assert.equal(hold.order.status, 'PENDING');
  assert.equal(hold.orderItems.length, 2);
  assert.equal(db.getDashboard(event.id).lockedSeats, 2);
  pass('active customer can lock seats and create pending order');

  const paidOrder = db.confirmPayment(customerAuth.user.id, hold.order.id, 'MOMO');
  assert.equal(paidOrder.status, 'PAID');
  assert.equal(db.getDashboard(event.id).soldSeats, 2);
  assert.equal(db.getDashboard(event.id).lockedSeats, 0);
  pass('payment confirmation marks order paid and seats sold');

  const customerOrders = db.listOrders(customerAuth.user.id);
  assert.equal(customerOrders.length, 1);
  assert.equal(customerOrders[0].status, 'PAID');
  pass('customer can list paid order');

  for (let seatCount = 1; seatCount <= 8; seatCount += 1) {
    const cancelSeatIds = db.getSeatMap(event.id).zones
      .flatMap((zone) => zone.seats)
      .filter((seat) => seat.status === 'AVAILABLE')
      .slice(0, seatCount)
      .map((seat) => seat.id);
    assert.equal(cancelSeatIds.length, seatCount);

    const pendingHold = db.lockSeats(customerAuth.user.id, event.id, cancelSeatIds);
    assert.equal(pendingHold.order.status, 'PENDING');
    assert.equal(pendingHold.orderItems.length, seatCount);
    assert.equal(db.getDashboard(event.id).lockedSeats, seatCount);

    const cancelled = db.cancelHold(customerAuth.user.id, pendingHold.order.id);
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal(cancelled.items.length, seatCount);
    assert.equal(db.getDashboard(event.id).lockedSeats, 0);

    const releasedSeats = db.getSeatMap(event.id).zones.flatMap((zone) => zone.seats);
    for (const seatId of cancelSeatIds) {
      assert.equal(releasedSeats.find((seat) => seat.id === seatId)?.status, 'AVAILABLE');
    }
  }
  pass('customer can cancel held seats for selections from 1 to 8 seats');

  const adminAuth = db.login('admin@ticketrush.local', 'Admin@123456');
  const adminEvent = db.createEvent(adminAuth.user.id, {
    title: 'Admin Created Event',
    description: 'Created by local db test.',
    location: 'Ha Noi',
    imageUrl: '',
    startTime: iso(addMinutes(new Date(), 60 * 24 * 30)),
    endTime: iso(addMinutes(new Date(), 60 * 24 * 30 + 150)),
    status: 'PUBLISHED',
    requiresQueue: false,
  });
  db.createZone(adminAuth.user.id, adminEvent.id, {
    name: 'Front',
    price: 1500000,
    rowLabels: ['A', 'B'],
    seatsPerRow: 3,
    color: '#f97316',
  });
  const generatedSeats = db.generateSeats(adminAuth.user.id, adminEvent.id);
  assert.equal(generatedSeats.length, 6);
  assert.equal(db.getDashboard(adminEvent.id).totalSeats, 6);
  pass('admin can create event, create zone, and generate seats');

  return {
    messages,
    summary: {
      users: db.snapshot().users.length,
      events: db.snapshot().events.length,
      seats: db.snapshot().seats.length,
      orders: db.snapshot().orders.length,
      orderItems: db.snapshot().order_items.length,
      queueEntries: db.snapshot().queue_entries.length,
      seatLockLogs: db.snapshot().seat_lock_logs.length,
      paidRevenue: db.getDashboard(event.id).revenue,
    },
  };
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const result = runLocalDbSmokeTest();
  console.log('Local TicketRush DB smoke test');
  for (const message of result.messages) {
    console.log(`PASS ${message}`);
  }
  console.log('Summary');
  console.log(JSON.stringify(result.summary, null, 2));
}
