import type {
  AdminRevenuePoint,
  Event,
  EventStats,
  Order,
  OrderItem,
  QueueEntry,
  Seat,
  SeatLockLog,
  SeatStatus,
  SeatViewStatus,
  SeatZone,
  User,
  ZoneLayout,
  ZoneStats,
  EventStatus,
} from './types';

export type {
  Event,
  EventStats,
  Order,
  OrderItem,
  QueueEntry,
  Seat,
  SeatLockLog,
  SeatStatus,
  SeatViewStatus,
  SeatZone,
  User,
  ZoneLayout,
  ZoneStats,
};

export const USERS: User[] = [
  {
    id: 1,
    full_name: 'Quản trị TicketRush',
    email: 'admin@ticketrush.vn',
    password_hash: '$2b$10$demo-admin-hash',
    role: 'admin',
    gender: 'other',
    dob: '1994-04-12',
    phone: '0901000001',
    created_at: '2026-01-05T08:00:00',
    updated_at: '2026-05-01T09:30:00',
  },
  {
    id: 2,
    full_name: 'Nguyễn Minh Anh',
    email: 'user@ticketrush.vn',
    password_hash: '$2b$10$demo-user-hash',
    role: 'customer',
    gender: 'female',
    dob: '1998-09-18',
    phone: '0902222333',
    created_at: '2026-02-12T10:15:00',
    updated_at: '2026-04-28T17:20:00',
  },
  {
    id: 3,
    full_name: 'Trần Quốc Bảo',
    email: 'bao@example.com',
    password_hash: '$2b$10$demo-bao-hash',
    role: 'customer',
    gender: 'male',
    dob: '1996-01-25',
    phone: '0919888777',
    created_at: '2026-03-03T11:00:00',
    updated_at: '2026-04-20T14:15:00',
  },
];

export const EVENTS: Event[] = [
  {
    id: 101,
    title: 'Sky Tour 2026',
    description:
      'Đêm nhạc sân vận động với nhiều khu ghế, hàng chờ trực tuyến và cơ chế giữ chỗ có thời hạn để bạn đặt vé an toàn hơn.',
    location: 'Sân vận động Mỹ Đình, Hà Nội',
    event_time: '2026-05-20T19:30:00',
    seat_plan: 'stadium-360|queue:50',
    sale_start_time: '2026-05-09T08:00:00',
    sale_end_time: '2026-05-20T18:30:00',
    status: 'on_sale',
    banner_url:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1280&q=80',
    created_by: 1,
    created_at: '2026-01-10T08:00:00',
    updated_at: '2026-05-09T08:30:00',
  },
  {
    id: 102,
    title: 'Rock Storm Festival',
    description:
      'Festival ngoài trời với khu đứng và khu ngồi xen kẽ, phù hợp cho nhóm bạn muốn chọn vị trí gần sân khấu.',
    location: 'Công viên Lê Văn Tám, TP. Hồ Chí Minh',
    event_time: '2026-06-01T17:00:00',
    seat_plan: 'outdoor-festival',
    sale_start_time: '2026-05-01T09:00:00',
    sale_end_time: '2026-06-01T16:00:00',
    status: 'on_sale',
    banner_url:
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1280&q=80',
    created_by: 1,
    created_at: '2026-01-18T09:20:00',
    updated_at: '2026-05-06T12:10:00',
  },
  {
    id: 103,
    title: 'Heartbeat Live Session',
    description:
      'Liveshow trong nhà với nhiều mức giá, sơ đồ ghế rõ ràng theo từng khu để bạn dễ chọn vị trí phù hợp.',
    location: 'Nhà hát Lớn Hà Nội, Hà Nội',
    event_time: '2026-06-10T20:00:00',
    seat_plan: 'theater|queue:50',
    sale_start_time: '2026-05-09T09:30:00',
    sale_end_time: '2026-06-10T19:00:00',
    status: 'on_sale',
    banner_url:
      'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1280&q=80',
    created_by: 1,
    created_at: '2026-02-02T10:10:00',
    updated_at: '2026-05-08T20:00:00',
  },
  {
    id: 104,
    title: 'Jazz on the River',
    description:
      'Đêm nhạc boutique có quy mô nhỏ, phù hợp kiểm thử các trạng thái available, locked và sold trên từng ghế.',
    location: 'Cầu Rồng Outdoor Stage, Đà Nẵng',
    event_time: '2026-06-22T19:00:00',
    seat_plan: 'river-stage',
    sale_start_time: '2026-05-15T09:00:00',
    sale_end_time: '2026-06-22T18:00:00',
    status: 'draft',
    banner_url:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1280&q=80',
    created_by: 1,
    created_at: '2026-02-20T13:45:00',
    updated_at: '2026-05-04T10:00:00',
  },
  {
    id: 105,
    title: 'All Star Gala Night',
    description:
      'Sự kiện gần hết vé, dùng để hiển thị trạng thái sold_out và thống kê lấp đầy từ seats.',
    location: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
    event_time: '2026-07-05T20:00:00',
    seat_plan: 'conference-hall',
    sale_start_time: '2026-05-03T10:00:00',
    sale_end_time: '2026-07-05T18:30:00',
    status: 'on_sale',
    banner_url:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1280&q=80',
    created_by: 1,
    created_at: '2026-03-01T08:00:00',
    updated_at: '2026-05-07T15:30:00',
  },
];

export const SEAT_ZONES: SeatZone[] = [
  { id: 10101, event_id: 101, name: 'VIP', price: 2500000, total_capacity: 30, created_at: '2026-01-10T08:05:00', updated_at: '2026-05-09T08:30:00' },
  { id: 10102, event_id: 101, name: 'A', price: 1600000, total_capacity: 60, created_at: '2026-01-10T08:05:00', updated_at: '2026-05-09T08:30:00' },
  { id: 10103, event_id: 101, name: 'B', price: 950000, total_capacity: 60, created_at: '2026-01-10T08:05:00', updated_at: '2026-05-09T08:30:00' },
  { id: 10104, event_id: 101, name: 'GENERAL', price: 550000, total_capacity: 90, created_at: '2026-01-10T08:05:00', updated_at: '2026-05-09T08:30:00' },

  { id: 10201, event_id: 102, name: 'FANZONE', price: 1200000, total_capacity: 40, created_at: '2026-01-18T09:30:00', updated_at: '2026-05-06T12:10:00' },
  { id: 10202, event_id: 102, name: 'A', price: 850000, total_capacity: 72, created_at: '2026-01-18T09:30:00', updated_at: '2026-05-06T12:10:00' },
  { id: 10203, event_id: 102, name: 'B', price: 650000, total_capacity: 72, created_at: '2026-01-18T09:30:00', updated_at: '2026-05-06T12:10:00' },
  { id: 10204, event_id: 102, name: 'STANDING', price: 390000, total_capacity: 96, created_at: '2026-01-18T09:30:00', updated_at: '2026-05-06T12:10:00' },

  { id: 10301, event_id: 103, name: 'BOX', price: 1800000, total_capacity: 24, created_at: '2026-02-02T10:15:00', updated_at: '2026-05-08T20:00:00' },
  { id: 10302, event_id: 103, name: 'ORCHESTRA', price: 1250000, total_capacity: 56, created_at: '2026-02-02T10:15:00', updated_at: '2026-05-08T20:00:00' },
  { id: 10303, event_id: 103, name: 'BALCONY', price: 780000, total_capacity: 60, created_at: '2026-02-02T10:15:00', updated_at: '2026-05-08T20:00:00' },

  { id: 10401, event_id: 104, name: 'RIVER VIP', price: 1400000, total_capacity: 24, created_at: '2026-02-20T14:00:00', updated_at: '2026-05-04T10:00:00' },
  { id: 10402, event_id: 104, name: 'STANDARD', price: 750000, total_capacity: 48, created_at: '2026-02-20T14:00:00', updated_at: '2026-05-04T10:00:00' },
  { id: 10403, event_id: 104, name: 'LAWN', price: 420000, total_capacity: 60, created_at: '2026-02-20T14:00:00', updated_at: '2026-05-04T10:00:00' },

  { id: 10501, event_id: 105, name: 'DIAMOND', price: 2200000, total_capacity: 28, created_at: '2026-03-01T08:15:00', updated_at: '2026-05-07T15:30:00' },
  { id: 10502, event_id: 105, name: 'GOLD', price: 1500000, total_capacity: 56, created_at: '2026-03-01T08:15:00', updated_at: '2026-05-07T15:30:00' },
  { id: 10503, event_id: 105, name: 'SILVER', price: 900000, total_capacity: 72, created_at: '2026-03-01T08:15:00', updated_at: '2026-05-07T15:30:00' },
  { id: 10504, event_id: 105, name: 'BRONZE', price: 500000, total_capacity: 80, created_at: '2026-03-01T08:15:00', updated_at: '2026-05-07T15:30:00' },
];

export const ZONE_LAYOUTS: ZoneLayout[] = [
  { zone_id: 10101, rows: 3, cols: 10, color: '#EAB308', x: 35, y: 18, width: 30, height: 20 },
  { zone_id: 10102, rows: 5, cols: 12, color: '#2563EB', x: 8, y: 43, width: 32, height: 28 },
  { zone_id: 10103, rows: 5, cols: 12, color: '#7C3AED', x: 60, y: 43, width: 32, height: 28 },
  { zone_id: 10104, rows: 6, cols: 15, color: '#64748B', x: 20, y: 75, width: 60, height: 18 },
  { zone_id: 10201, rows: 4, cols: 10, color: '#EF4444', x: 31, y: 18, width: 38, height: 22 },
  { zone_id: 10202, rows: 6, cols: 12, color: '#F97316', x: 8, y: 45, width: 35, height: 30 },
  { zone_id: 10203, rows: 6, cols: 12, color: '#0EA5E9', x: 57, y: 45, width: 35, height: 30 },
  { zone_id: 10204, rows: 6, cols: 16, color: '#64748B', x: 18, y: 78, width: 64, height: 17 },
  { zone_id: 10301, rows: 3, cols: 8, color: '#D946EF', x: 8, y: 25, width: 24, height: 26 },
  { zone_id: 10302, rows: 7, cols: 8, color: '#14B8A6', x: 35, y: 26, width: 30, height: 45 },
  { zone_id: 10303, rows: 5, cols: 12, color: '#6366F1', x: 68, y: 25, width: 24, height: 38 },
  { zone_id: 10401, rows: 3, cols: 8, color: '#F59E0B', x: 34, y: 20, width: 32, height: 22 },
  { zone_id: 10402, rows: 4, cols: 12, color: '#22C55E', x: 22, y: 48, width: 56, height: 26 },
  { zone_id: 10403, rows: 5, cols: 12, color: '#0F766E', x: 12, y: 78, width: 76, height: 17 },
  { zone_id: 10501, rows: 4, cols: 7, color: '#FACC15', x: 34, y: 18, width: 32, height: 24 },
  { zone_id: 10502, rows: 7, cols: 8, color: '#FB7185', x: 8, y: 46, width: 34, height: 32 },
  { zone_id: 10503, rows: 6, cols: 12, color: '#38BDF8', x: 58, y: 46, width: 34, height: 32 },
  { zone_id: 10504, rows: 5, cols: 16, color: '#94A3B8', x: 18, y: 80, width: 64, height: 15 },
];

interface SeatPlanLayoutPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

const SEAT_PLAN_LAYOUT_PREFIX = 'layout:';

export function readSeatPlanLayouts(seatPlan: string): Record<string, SeatPlanLayoutPlacement> {
  const layoutPart = seatPlan
    .split('|')
    .map(part => part.trim())
    .find(part => part.startsWith(SEAT_PLAN_LAYOUT_PREFIX));

  if (!layoutPart) return {};

  try {
    const raw = decodeURIComponent(layoutPart.slice(SEAT_PLAN_LAYOUT_PREFIX.length));
    const entries = JSON.parse(raw) as Array<SeatPlanLayoutPlacement & { name?: string }>;
    return entries.reduce<Record<string, SeatPlanLayoutPlacement>>((map, entry) => {
      const name = entry.name?.trim().toLowerCase();
      if (!name) return map;
      map[name] = {
        x: Number(entry.x),
        y: Number(entry.y),
        width: Number(entry.width),
        height: Number(entry.height),
        rotation: Number(entry.rotation || 0),
      };
      return map;
    }, {});
  } catch {
    return {};
  }
}

export function applySeatPlanLayouts(layouts: ZoneLayout[], zones: SeatZone[], seatPlan: string): ZoneLayout[] {
  const layoutByName = readSeatPlanLayouts(seatPlan);
  if (Object.keys(layoutByName).length === 0) return layouts;

  return layouts.map(layout => {
    const zone = zones.find(item => item.id === layout.zone_id);
    const placement = zone ? layoutByName[zone.name.trim().toLowerCase()] : undefined;
    return placement ? { ...layout, ...placement } : layout;
  });
}

function makeSeatId(zoneId: number, rowIndex: number, seatNumber: number): number {
  return zoneId * 10000 + rowIndex * 100 + seatNumber;
}

function statusForSeat(zoneId: number, rowIndex: number, seatNumber: number): SeatStatus {
  const value = (zoneId + rowIndex * 17 + seatNumber * 11) % 10;
  if (zoneId >= 10501 && zoneId <= 10504) return value < 7 ? 'sold' : value === 7 ? 'locked' : 'available';
  if (value < 3) return 'sold';
  if (value === 3) return 'locked';
  return 'available';
}

export function generateSeats(zones: SeatZone[] = SEAT_ZONES, layouts: ZoneLayout[] = ZONE_LAYOUTS): Seat[] {
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  return zones.flatMap(zone => {
    const layout = layouts.find(item => item.zone_id === zone.id);
    const cols = layout?.cols ?? Math.ceil(Math.sqrt(zone.total_capacity));
    const rowCount = layout?.rows ?? Math.ceil(zone.total_capacity / cols);
    const seats: Seat[] = [];

    for (let row = 0; row < rowCount; row += 1) {
      for (let seatNumber = 1; seatNumber <= cols; seatNumber += 1) {
        if (seats.length >= zone.total_capacity) break;
        const id = makeSeatId(zone.id, row, seatNumber);
        seats.push({
          id,
          zone_id: zone.id,
          row_label: rows[row] ?? String(row + 1),
          seat_number: seatNumber,
          status: statusForSeat(zone.id, row, seatNumber),
          locked_by: statusForSeat(zone.id, row, seatNumber) === 'locked' ? 3 : undefined,
          lock_expires_at: statusForSeat(zone.id, row, seatNumber) === 'locked' ? '2026-05-09T23:00:00' : undefined,
          created_at: zone.created_at,
          updated_at: zone.updated_at,
        });
      }
    }

    return seats;
  });
}

export const SEATS: Seat[] = generateSeats();

const demoOrderSeatIds = [
  makeSeatId(10201, 0, 1),
  makeSeatId(10201, 0, 2),
  makeSeatId(10202, 1, 6),
];

for (const seat of SEATS) {
  if (demoOrderSeatIds.includes(seat.id)) {
    seat.status = 'sold';
    seat.locked_by = undefined;
    seat.lock_expires_at = undefined;
  }
}

export const ORDERS: Order[] = [
  {
    id: 5001,
    order_code: 'ORD-20260509-001',
    user_id: 2,
    event_id: 102,
    status: 'paid',
    total_amount: 3412500,
    expires_at: '2026-05-09T12:10:00',
    paid_at: '2026-05-09T12:04:00',
    payment_method: 'VNPAY',
    created_at: '2026-05-09T12:00:00',
    updated_at: '2026-05-09T12:04:00',
  },
  {
    id: 5002,
    order_code: 'ORD-20260508-014',
    user_id: 3,
    event_id: 101,
    status: 'paid',
    total_amount: 2625000,
    expires_at: '2026-05-08T20:10:00',
    paid_at: '2026-05-08T20:03:00',
    payment_method: 'MOMO',
    created_at: '2026-05-08T20:00:00',
    updated_at: '2026-05-08T20:03:00',
  },
];

export const ORDER_ITEMS: OrderItem[] = [
  { id: 7001, order_id: 5001, seat_id: demoOrderSeatIds[0], price: 1200000, created_at: '2026-05-09T12:00:00' },
  { id: 7002, order_id: 5001, seat_id: demoOrderSeatIds[1], price: 1200000, created_at: '2026-05-09T12:00:00' },
  { id: 7003, order_id: 5001, seat_id: demoOrderSeatIds[2], price: 850000, created_at: '2026-05-09T12:00:00' },
  { id: 7004, order_id: 5002, seat_id: makeSeatId(10101, 1, 5), price: 2500000, created_at: '2026-05-08T20:00:00' },
];

export const QUEUE_ENTRIES: QueueEntry[] = [
  {
    id: 9001,
    event_id: 101,
    user_id: 2,
    queue_token: 'Q-101-A9K2',
    status: 'waiting',
    position_number: 42,
    expires_at: '2026-05-09T23:30:00',
    created_at: '2026-05-09T09:05:00',
  },
  {
    id: 9002,
    event_id: 103,
    user_id: 3,
    queue_token: 'Q-103-L8N1',
    status: 'active',
    position_number: 0,
    activated_at: '2026-05-09T10:20:00',
    expires_at: '2026-05-09T10:25:00',
    created_at: '2026-05-09T09:31:00',
  },
];

export const SEAT_LOCK_LOGS: SeatLockLog[] = [
  { id: 10001, seat_id: demoOrderSeatIds[0], user_id: 2, action: 'lock', reason: 'Hold before checkout', created_at: '2026-05-09T11:55:00' },
  { id: 10002, seat_id: demoOrderSeatIds[0], user_id: 2, action: 'purchase', reason: 'Order ORD-20260509-001 paid', created_at: '2026-05-09T12:04:00' },
  { id: 10003, seat_id: makeSeatId(10102, 2, 4), user_id: 3, action: 'expire', reason: 'Hold timeout', created_at: '2026-05-09T10:40:00' },
];

export const ADMIN_REVENUE: AdminRevenuePoint[] = [
  { label: 'T1', revenue: 42000000, tickets: 52 },
  { label: 'T2', revenue: 61000000, tickets: 74 },
  { label: 'T3', revenue: 78000000, tickets: 91 },
  { label: 'T4', revenue: 94000000, tickets: 120 },
  { label: 'T5', revenue: 126000000, tickets: 158 },
  { label: 'T6', revenue: 108000000, tickets: 139 },
];

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)} • ${formatTime(isoString)}`;
}

export function getEventCity(event: Event): string {
  const parts = event.location.split(',');
  return parts[parts.length - 1]?.trim() ?? event.location;
}

export function getZonesForEvent(eventId: number, zones: SeatZone[] = SEAT_ZONES): SeatZone[] {
  return zones.filter(zone => zone.event_id === eventId);
}

export function getLayout(zoneId: number, layouts: ZoneLayout[] = ZONE_LAYOUTS): ZoneLayout | undefined {
  return layouts.find(layout => layout.zone_id === zoneId);
}

export function getSeatsForEvent(
  eventId: number,
  seats: Seat[] = SEATS,
  zones: SeatZone[] = SEAT_ZONES,
): Seat[] {
  const zoneIds = new Set(getZonesForEvent(eventId, zones).map(zone => zone.id));
  return seats.filter(seat => zoneIds.has(seat.zone_id));
}

export function getSeatZone(seat: Seat, zones: SeatZone[] = SEAT_ZONES): SeatZone | undefined {
  return zones.find(zone => zone.id === seat.zone_id);
}

export function getZoneColor(zoneId: number): string {
  return getLayout(zoneId)?.color ?? '#64748B';
}

export function getZoneStats(zones: SeatZone[], seats: Seat[]): ZoneStats[] {
  return zones.map(zone => {
    const zoneSeats = seats.filter(seat => seat.zone_id === zone.id);
    return {
      zone_id: zone.id,
      name: zone.name,
      price: zone.price,
      total_capacity: zone.total_capacity,
      available: zoneSeats.filter(seat => seat.status === 'available').length,
      locked: zoneSeats.filter(seat => seat.status === 'locked').length,
      sold: zoneSeats.filter(seat => seat.status === 'sold').length,
      selected: zoneSeats.filter(seat => seat.status === 'selected').length,
      color: getZoneColor(zone.id),
    };
  });
}

export function getEventStats(zones: SeatZone[], seats: Seat[], orderItems: OrderItem[] = ORDER_ITEMS): EventStats {
  const zoneIds = new Set(zones.map(zone => zone.id));
  const eventSeats = seats.filter(seat => zoneIds.has(seat.zone_id));
  const minPrice = zones.length > 0 ? Math.min(...zones.map(zone => zone.price)) : 0;
  const sold = eventSeats.filter(seat => seat.status === 'sold').length;
  const revenue = orderItems.reduce((sum, item) => {
    const seat = seats.find(candidate => candidate.id === item.seat_id);
    return seat && zoneIds.has(seat.zone_id) ? sum + item.price : sum;
  }, 0);

  return {
    total_capacity: zones.reduce((sum, zone) => sum + zone.total_capacity, 0),
    available: eventSeats.filter(seat => seat.status === 'available').length,
    locked: eventSeats.filter(seat => seat.status === 'locked').length,
    sold,
    selected: eventSeats.filter(seat => seat.status === 'selected').length,
    min_price: minPrice,
    revenue,
    occupancy_pct: eventSeats.length ? Math.round((sold / eventSeats.length) * 100) : 0,
  };
}

function getTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function getAutoEventStatus(
  event: Event,
  stats?: Pick<EventStats, 'available' | 'total_capacity'>,
  now = new Date(),
): EventStatus {
  if (event.status === 'cancelled' || event.status === 'paused') return event.status;

  const current = now.getTime();
  const saleStart = getTime(event.sale_start_time);
  const saleEnd = getTime(event.sale_end_time);
  const eventTime = getTime(event.event_time);

  if (eventTime && current >= eventTime) return 'ended';
  if (saleEnd && current > saleEnd) return 'ended';
  if (stats && stats.total_capacity > 0 && stats.available <= 0) return 'sold_out';
  if (saleStart && current < saleStart) return 'draft';
  if ((!saleStart || current >= saleStart) && (!saleEnd || current <= saleEnd)) return 'on_sale';

  return event.status;
}

export function requiresQueue(event: Event, stats?: Pick<EventStats, 'available' | 'total_capacity'>): boolean {
  return event.seat_plan.includes('queue') && getAutoEventStatus(event, stats) === 'on_sale';
}

export function isSaleOpen(event: Event): boolean {
  return getAutoEventStatus(event) === 'on_sale';
}

export function makeSeatLabel(seat: Seat, zone?: SeatZone, language: 'vi' | 'en' = 'vi'): string {
  if (language === 'en') return `${zone?.name ?? 'Zone'} - Row ${seat.row_label}, Seat ${seat.seat_number}`;
  return `${zone?.name ?? 'Khu'} - Hàng ${seat.row_label}, Ghế ${seat.seat_number}`;
}

export function makeOrderCode(id: number): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `ORD-${date}-${String(id).padStart(3, '0')}`;
}

export function makeQueueToken(eventId: number): string {
  return `Q-${eventId}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function makeQrValue(order: Order, item: OrderItem): string {
  return `TR:${order.order_code}:SEAT-${item.seat_id}`;
}
