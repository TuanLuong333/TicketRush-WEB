import type {
  ApiEvent,
  ApiOrder,
  ApiOrderItem,
  ApiQueueEntry,
  ApiStats,
  ApiUser,
  ApiZone,
} from './client';
import { AUTO_QUEUE_THRESHOLD } from '../data/types';
import type {
  Event,
  EventStats,
  Order,
  OrderItem,
  QueueEntry,
  Seat,
  SeatStatus,
  SeatViewStatus,
  SeatZone,
  User,
  ZoneLayout,
} from '../data/types';

function nowIso() {
  return new Date().toISOString();
}

function adaptSeatPlan(event: ApiEvent) {
  const explicitSeatPlan = event.seatPlan || event.seat_plan || event.seatPlanCode || event.seat_plan_code;
  if (explicitSeatPlan) return explicitSeatPlan;

  const queueMode = String(event.queueMode ?? event.queue_mode ?? '').toUpperCase();
  const queueEnabled = Boolean(event.queueEnabled ?? event.queue_enabled);
  if (queueMode === 'AUTO' || queueEnabled) {
    const threshold = Number(event.queueThreshold ?? event.queue_threshold ?? AUTO_QUEUE_THRESHOLD);
    return `seat-map|queue:${Number.isFinite(threshold) && threshold > 0 ? threshold : AUTO_QUEUE_THRESHOLD}`;
  }

  return 'seat-map';
}

export function normalizeRole(role?: string): User['role'] {
  return role === 'ADMIN' ? 'admin' : 'customer';
}

export function normalizeGender(gender?: string | null): User['gender'] {
  if (gender === 'MALE') return 'male';
  if (gender === 'FEMALE') return 'female';
  return 'other';
}

export function normalizeEventStatus(status?: string): Event['status'] {
  if (status === 'DRAFT') return 'draft';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'FINISHED') return 'ended';
  return 'on_sale';
}

export function normalizeSeatStatus(status?: string): SeatStatus {
  if (status === 'LOCKED') return 'locked';
  if (status === 'SOLD') return 'sold';
  return 'available';
}

export function toApiSeatStatus(status: SeatViewStatus) {
  if (status === 'locked') return 'LOCKED';
  if (status === 'sold') return 'SOLD';
  return 'AVAILABLE';
}

export function normalizeOrderStatus(status?: string): Order['status'] {
  if (status === 'PAID') return 'paid';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'EXPIRED') return 'expired';
  if (status === 'REFUNDED') return 'refunded';
  return 'pending';
}

export function normalizeQueueStatus(status?: string): QueueEntry['status'] {
  if (status === 'ACTIVE') return 'active';
  if (status === 'DONE') return 'completed';
  if (status === 'EXPIRED') return 'expired';
  return 'waiting';
}

export function adaptUser(user: ApiUser): User {
  const createdAt = user.createdAt || nowIso();
  return {
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    password_hash: '',
    role: normalizeRole(user.role),
    gender: normalizeGender(user.gender),
    dob: user.dateOfBirth || '',
    phone: user.phone || '',
    created_at: createdAt,
    updated_at: createdAt,
  };
}

export function adaptEvent(event: ApiEvent): Event {
  const createdAt = event.createdAt || nowIso();
  const start = event.startTime || createdAt;
  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    location: event.location,
    event_time: start,
    seat_plan: adaptSeatPlan(event),
    seat_map_image_url: event.seatMapImageUrl || event.seat_map_image_url || undefined,
    sale_start_time: event.saleStartTime || start,
    sale_end_time: event.saleEndTime || event.endTime || start,
    status: normalizeEventStatus(event.status),
    banner_url: event.bannerUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1280&q=80',
    created_by: event.createdBy || 0,
    created_at: createdAt,
    updated_at: event.updatedAt || createdAt,
  };
}

export function adaptStats(stats?: ApiStats): EventStats {
  const total = Number(stats?.totalSeats || 0);
  const sold = Number(stats?.soldSeats || 0);
  return {
    total_capacity: total,
    available: Number(stats?.availableSeats || 0),
    locked: Number(stats?.lockedSeats || 0),
    sold,
    selected: 0,
    min_price: 0,
    revenue: 0,
    occupancy_pct: total ? Math.round((sold / total) * 100) : 0,
  };
}

export function adaptZone(zone: ApiZone, eventId: number): SeatZone {
  return {
    id: zone.id,
    event_id: zone.eventId || eventId,
    name: zone.name,
    price: Number(zone.price || 0),
    total_capacity: Number(zone.rowCount || 0) * Number(zone.seatsPerRow || 0),
    color: zone.color || undefined,
    created_at: zone.createdAt || nowIso(),
    updated_at: zone.createdAt || nowIso(),
  };
}

export function adaptZoneLayout(zone: ApiZone): ZoneLayout {
  return {
    zone_id: zone.id,
    rows: Number(zone.rowCount || 0),
    cols: Number(zone.seatsPerRow || 0),
    color: zone.color || '#0EA5E9',
  };
}

export function adaptSeatMap(eventId: number, zones: ApiZone[]) {
  const adaptedZones = zones.map(zone => adaptZone(zone, eventId));
  const layouts = zones.map(adaptZoneLayout);
  const seats: Seat[] = [];

  for (const zone of zones) {
    for (const row of zone.rows || []) {
      for (const seat of row.seats) {
        const status = normalizeSeatStatus(seat.status);
        const lockExpired = status === 'locked' && seat.lockedUntil && new Date(seat.lockedUntil).getTime() <= Date.now();
        seats.push({
          id: seat.id,
          zone_id: zone.id,
          row_label: row.rowLabel,
          seat_number: seat.seatNumber,
          status: lockExpired ? 'available' : status,
          lock_expires_at: lockExpired ? undefined : seat.lockedUntil || undefined,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }
    }
  }

  return { zones: adaptedZones, layouts, seats };
}

export function adaptOrder(order: ApiOrder, paymentMethod?: Order['payment_method']): Order {
  const createdAt = order.createdAt || nowIso();
  const customer = order.customer || order.user;
  return {
    id: order.id,
    order_code: order.orderCode,
    user_id: order.userId,
    customer_name: customer?.fullName,
    customer_email: customer?.email,
    customer_phone: customer?.phone || undefined,
    event_id: order.eventId,
    status: normalizeOrderStatus(order.status),
    total_amount: Number(order.totalAmount || 0),
    item_count: Number(order.itemCount ?? order.item_count ?? 0),
    expires_at: order.expiresAt,
    paid_at: order.paidAt || undefined,
    payment_method: paymentMethod,
    created_at: createdAt,
    updated_at: order.updatedAt || createdAt,
  };
}

export function adaptOrderItem(item: ApiOrderItem, orderId: number, index = 0): OrderItem {
  return {
    id: item.id || orderId * 1000 + index + 1,
    order_id: orderId,
    seat_id: item.seatId,
    price: Number(item.price || 0),
    created_at: item.createdAt || nowIso(),
  };
}

export function adaptQueueEntry(entry: ApiQueueEntry, eventId: number, userId: number): QueueEntry {
  const createdAt = entry.createdAt || nowIso();
  return {
    id: entry.id || Date.now(),
    event_id: entry.eventId || eventId,
    user_id: entry.userId || userId,
    queue_token: entry.queueToken || '',
    status: normalizeQueueStatus(entry.status),
    position_number: Number(entry.position ?? entry.positionNumber ?? 0),
    people_ahead: entry.peopleAhead === null || entry.peopleAhead === undefined ? undefined : Number(entry.peopleAhead),
    can_enter: entry.canEnter,
    activated_at: entry.activatedAt || undefined,
    expires_at: entry.expiresAt || undefined,
    created_at: createdAt,
  };
}
