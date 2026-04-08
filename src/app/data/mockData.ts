/**
 * Mock data aligned with the database schema.
 * All structures mirror their DB counterparts defined in types.ts.
 *
 * When integrating with the real API, replace these exports with
 * async fetch functions returning the same types.
 */

import type {
  Event, EventSeat, VenueSection, Order, OrderItem, Ticket,
  Queue, QueueEntry, SessionRevenueSummary, AudienceDemographics,
  SeatStatus, PriceTier,
} from './types';

export type { SeatStatus, PriceTier };
export type { Event, EventSeat, VenueSection, Order, OrderItem, Ticket, Queue, QueueEntry };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatPrice(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)} • ${formatTime(isoString)}`;
}

// ─── Default Sections (for event creation) ────────────────────────────────────

export const DEFAULT_SECTIONS: VenueSection[] = [
  { section_name: 'VIP',     price_tier: 'VIP',      price: 2000000, color: '#F59E0B', total_seats: 30,  sold_seats: 0, rows: 3, cols: 10 },
  { section_name: 'A',       price_tier: 'STANDARD',  price: 1000000, color: '#3B82F6', total_seats: 60,  sold_seats: 0, rows: 5, cols: 12 },
  { section_name: 'B',       price_tier: 'ECONOMY',   price: 700000,  color: '#8B5CF6', total_seats: 60,  sold_seats: 0, rows: 5, cols: 12 },
  { section_name: 'GENERAL', price_tier: 'GENERAL',   price: 350000,  color: '#6B7280', total_seats: 90,  sold_seats: 0, rows: 6, cols: 15 },
];

// ─── Events ───────────────────────────────────────────────────────────────────

function makeSections(overrides?: Partial<VenueSection>[]): VenueSection[] {
  return DEFAULT_SECTIONS.map((s, i) => ({
    ...s,
    ...(overrides?.[i] ?? {}),
  }));
}

export const EVENTS: Event[] = [
  {
    id: 'evt-001',
    organizer_id: 'org-001',
    title: 'Sky Tour 2026',
    artist: 'Sơn Tùng M-TP',
    description:
      'Đêm nhạc hoành tráng của Sơn Tùng M-TP với loạt bản hit đình đám. Sky Tour 2026 hứa hẹn mang đến một trải nghiệm âm nhạc chưa từng có tại Hà Nội với sân khấu 360 độ, màn hình LED khổng lồ và hiệu ứng ánh sáng mãn nhãn.',
    venue: 'Sân vận động Mỹ Đình',
    city: 'Hà Nội',
    date_start: '2026-05-15T19:30:00',
    date_end:   '2026-05-15T22:00:00',
    banner_url:
      'https://images.unsplash.com/photo-1658046413536-6e5933dfd939?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGNvbmNlcnQlMjBjcm93ZCUyMHN0YWdlJTIwbGlnaHRzfGVufDF8fHx8MTc3NTU3MTQ2N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    poster_url: 'https://images.unsplash.com/photo-1658046413536-6e5933dfd939?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGNvbmNlcnQlMjBjcm93ZCUyMHN0YWdlJTIwbGlnaHRzfGVufDF8fHx8MTc3NTU3MTQ2N3ww&ixlib=rb-4.1.0&q=80&w=720',
    status: 'on_sale',
    genres: ['Pop', 'R&B', 'Hip-hop'],
    sections: makeSections([
      { sold_seats: 20 }, { sold_seats: 45 }, { sold_seats: 38 }, { sold_seats: 60 },
    ]),
    total_seats: 240,
    sold_seats: 163,
    has_queue: true,
    flash_sale_ends: '2026-04-15T20:00:00',
    featured: true,
    created_at: '2026-01-10T08:00:00',
  },
  {
    id: 'evt-002',
    organizer_id: 'org-002',
    title: 'Rock Storm Festival 2026',
    artist: 'Various Artists',
    description:
      'Lễ hội âm nhạc rock lớn nhất miền Nam với sự góp mặt của hàng chục ban nhạc trong và ngoài nước. Hai ngày hai đêm sục sôi cùng tiếng guitar gầm rú.',
    venue: 'Công viên Lê Văn Tám',
    city: 'TP. Hồ Chí Minh',
    date_start: '2026-05-20T17:00:00',
    date_end:   '2026-05-20T23:00:00',
    banner_url:
      'https://images.unsplash.com/photo-1772582728668-619b2ad2c916?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwZmVzdGl2YWwlMjBvdXRkb29yJTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzc1NTcxNDY4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 'on_sale',
    genres: ['Rock', 'Metal', 'Alternative'],
    sections: makeSections([
      { sold_seats: 18 }, { sold_seats: 40 }, { sold_seats: 50 }, { sold_seats: 72 },
    ]),
    total_seats: 240,
    sold_seats: 180,
    has_queue: false,
    featured: false,
    created_at: '2026-01-15T09:00:00',
  },
  {
    id: 'evt-003',
    organizer_id: 'org-001',
    title: 'Heartbeat Live Tour',
    artist: 'Mono',
    description:
      'Mono trở lại với liveshow solo đầu tiên tại Nhà hát Lớn Hà Nội. Một đêm nhạc thấm đẫm cảm xúc với những ca khúc ballad đình đám.',
    venue: 'Nhà hát Lớn Hà Nội',
    city: 'Hà Nội',
    date_start: '2026-06-01T20:00:00',
    date_end:   '2026-06-01T22:30:00',
    banner_url:
      'https://images.unsplash.com/photo-1760111102591-c6390c8a652d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxFRE0lMjBlbGVjdHJvbmljJTIwZGFuY2UlMjBtdXNpYyUyMGNvbmNlcnR8ZW58MXx8fHwxNzc1NTcxNDY4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    poster_url: 'https://images.unsplash.com/photo-1760111102591-c6390c8a652d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxFRE0lMjBlbGVjdHJvbmljJTIwZGFuY2UlMjBtdXNpYyUyMGNvbmNlcnR8ZW58MXx8fHwxNzc1NTcxNDY4fDA&ixlib=rb-4.1.0&q=80&w=720',
    status: 'on_sale',
    genres: ['Ballad', 'Pop'],
    sections: makeSections([
      { sold_seats: 25 }, { sold_seats: 50 }, { sold_seats: 45 }, { sold_seats: 70 },
    ]),
    total_seats: 240,
    sold_seats: 190,
    has_queue: true,
    flash_sale_ends: '2026-05-01T20:00:00',
    featured: true,
    created_at: '2026-02-01T10:00:00',
  },
  {
    id: 'evt-004',
    organizer_id: 'org-003',
    title: 'Jazz on the River',
    artist: 'Nguyên Lê & Friends',
    description:
      'Đêm nhạc Jazz đặc biệt bên bờ sông Hàn thơ mộng. Thưởng thức âm nhạc cùng khung cảnh Cầu Rồng lung linh về đêm.',
    venue: 'Cầu Rồng Outdoor Stage',
    city: 'Đà Nẵng',
    date_start: '2026-06-10T19:00:00',
    date_end:   '2026-06-10T22:00:00',
    banner_url:
      'https://images.unsplash.com/photo-1763215733028-02803292649c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwbGl2ZSUyMG11c2ljJTIwcGVyZm9ybWFuY2UlMjB2ZW51ZXxlbnwxfHx8fDE3NzU1NzE0Njl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 'on_sale',
    genres: ['Jazz', 'Blues', 'Acoustic'],
    sections: makeSections([
      { sold_seats: 5 }, { sold_seats: 15 }, { sold_seats: 10 }, { sold_seats: 25 },
    ]),
    total_seats: 240,
    sold_seats: 55,
    has_queue: false,
    created_at: '2026-02-10T11:00:00',
  },
  {
    id: 'evt-005',
    organizer_id: 'org-002',
    title: 'World Tour Vietnam 2026',
    artist: 'Vũ Cát Tường',
    description:
      'Sau hành trình chinh phục thế giới, Vũ Cát Tường trở về nhà với World Tour Vietnam 2026 – đêm diễn đỉnh cao kết hợp âm nhạc và nghệ thuật thị giác.',
    venue: 'Nhà thi đấu Phú Thọ',
    city: 'TP. Hồ Chí Minh',
    date_start: '2026-06-20T19:30:00',
    date_end:   '2026-06-20T22:00:00',
    banner_url:
      'https://images.unsplash.com/photo-1698678302519-0ce1fe8d6f9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVhdGVyJTIwc3RhZ2UlMjBwZXJmb3JtYW5jZSUyMGFydHN8ZW58MXx8fHwxNzc1NTcxNDY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    poster_url: 'https://images.unsplash.com/photo-1698678302519-0ce1fe8d6f9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVhdGVyJTIwc3RhZ2UlMjBwZXJmb3JtYW5jZSUyMGFydHN8ZW58MXx8fHwxNzc1NTcxNDY5fDA&ixlib=rb-4.1.0&q=80&w=720',
    status: 'on_sale',
    genres: ['Pop', 'Indie', 'Electronic'],
    sections: makeSections([
      { sold_seats: 12 }, { sold_seats: 30 }, { sold_seats: 28 }, { sold_seats: 40 },
    ]),
    total_seats: 240,
    sold_seats: 110,
    has_queue: false,
    created_at: '2026-02-20T12:00:00',
  },
  {
    id: 'evt-006',
    organizer_id: 'org-001',
    title: 'All Star Gala Night',
    artist: 'Rap Việt Cast',
    description:
      'Đại hội những rapper đình đám nhất Việt Nam hội tụ trong một đêm duy nhất. Không thể bỏ lỡ sự kiện hip-hop lớn nhất năm!',
    venue: 'Trung tâm Hội nghị Quốc gia',
    city: 'Hà Nội',
    date_start: '2026-07-01T20:00:00',
    date_end:   '2026-07-01T23:00:00',
    banner_url:
      'https://images.unsplash.com/photo-1771344158459-414a0a0c6981?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBzdGFkaXVtJTIwYXJlbmElMjBldmVudHxlbnwxfHx8fDE3NzU1NzE0Njl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 'on_sale',
    genres: ['Rap', 'Hip-hop', 'R&B'],
    sections: makeSections([
      { sold_seats: 10 }, { sold_seats: 25 }, { sold_seats: 30 }, { sold_seats: 50 },
    ]),
    total_seats: 240,
    sold_seats: 115,
    has_queue: false,
    created_at: '2026-03-01T13:00:00',
  },
];

// ─── Seat Generation ──────────────────────────────────────────────────────────

/** Deterministic seat status based on position — simulates real DB data */
function getSeatStatus(section: string, rowIdx: number, colIdx: number): SeatStatus {
  const val = (rowIdx * 13 + colIdx * 7 + section.charCodeAt(0) * 3) % 10;
  if (val < 3) return 'sold';
  if (val === 3) return 'locked';
  return 'available';
}

/**
 * Generates a flat list of EventSeat records for a given event.
 * Mirrors what you'd receive from `SELECT * FROM event_seats WHERE event_id = ?`
 */
export function generateSeats(eventId: string, sections: VenueSection[]): EventSeat[] {
  const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const seats: EventSeat[] = [];
  for (const section of sections) {
    for (let r = 0; r < section.rows; r++) {
      for (let c = 1; c <= section.cols; c++) {
        const row_label = ROWS[r];
        seats.push({
          id: `${eventId}-${section.section_name}-${row_label}${c}`,
          event_id: eventId,
          section_name: section.section_name,
          seat_number: c,
          row_label,
          price_tier: section.price_tier,
          price: section.price,
          status: getSeatStatus(section.section_name, r, c),
        });
      }
    }
  }
  return seats;
}

// ─── Demo Order (pre-loaded for MyTickets demo) ───────────────────────────────

const DEMO_ITEMS: OrderItem[] = [
  {
    id: 'item-001',
    order_id: 'ORD-DEMO01',
    ticket_id: 'tkt-001',
    seat_label: 'VIP - Hàng A, Ghế 1',
    section_name: 'VIP',
    row_label: 'A',
    seat_number: 1,
    price_tier: 'VIP',
    quantity: 1,
    unit_price: 2000000,
    subtotal: 2000000,
  },
  {
    id: 'item-002',
    order_id: 'ORD-DEMO01',
    ticket_id: 'tkt-002',
    seat_label: 'VIP - Hàng A, Ghế 2',
    section_name: 'VIP',
    row_label: 'A',
    seat_number: 2,
    price_tier: 'VIP',
    quantity: 1,
    unit_price: 2000000,
    subtotal: 2000000,
  },
];

const DEMO_TICKETS: Ticket[] = [
  { id: 'tkt-001', order_id: 'ORD-DEMO01', seat_id: 'evt-002-VIP-A1', qr_code: 'TR:ORD-DEMO01:tkt-001', status: 'issued', created_at: '2026-04-05T14:32:00' },
  { id: 'tkt-002', order_id: 'ORD-DEMO01', seat_id: 'evt-002-VIP-A2', qr_code: 'TR:ORD-DEMO01:tkt-002', status: 'issued', created_at: '2026-04-05T14:32:00' },
];

export const DEMO_ORDER: Order = {
  id: 'ORD-DEMO01',
  user_id: 'user-001',
  event_id: 'evt-002',
  event_title: 'Rock Storm Festival 2026',
  event_artist: 'Various Artists',
  event_date_start: '2026-05-20T17:00:00',
  event_venue: 'Công viên Lê Văn Tám',
  event_city: 'TP. Hồ Chí Minh',
  event_banner_url:
    'https://images.unsplash.com/photo-1772582728668-619b2ad2c916?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwZmVzdGl2YWwlMjBvdXRkb29yJTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzc1NTcxNDY4fDA&ixlib=rb-4.1.0&q=80&w=1080',
  payment_method: 'VNPAY',
  total_amount: 4200000,
  service_fee: 200000,   // ~5% of 4 000 000
  status: 'confirmed',
  booked_at: '2026-04-05T14:32:00',
  items: DEMO_ITEMS,
  tickets: DEMO_TICKETS,
};

// ─── Analytics Mock Data ───────────────────────────────────────────────────────

/**
 * Mirrors `va_session_revenue_summary` view — used in Admin Dashboard charts.
 */
export const REVENUE_SUMMARY: SessionRevenueSummary[] = [
  { session_id: 's1', event_id: '', date: 'T1', total_revenue: 45000000,  total_tickets: 210, avg_price_per_ticket: 214285, updated_at: '2026-01-31' },
  { session_id: 's2', event_id: '', date: 'T2', total_revenue: 62000000,  total_tickets: 285, avg_price_per_ticket: 217543, updated_at: '2026-02-28' },
  { session_id: 's3', event_id: '', date: 'T3', total_revenue: 58000000,  total_tickets: 268, avg_price_per_ticket: 216417, updated_at: '2026-03-31' },
  { session_id: 's4', event_id: '', date: 'T4', total_revenue: 79000000,  total_tickets: 341, avg_price_per_ticket: 231671, updated_at: '2026-04-07' },
  { session_id: 's5', event_id: '', date: 'T5', total_revenue: 95000000,  total_tickets: 420, avg_price_per_ticket: 226190, updated_at: '2026-04-07' },
  { session_id: 's6', event_id: '', date: 'T6', total_revenue: 112000000, total_tickets: 510, avg_price_per_ticket: 219607, updated_at: '2026-04-07' },
];

/**
 * Mirrors `va_session_audience_demographics` view.
 */
export const AUDIENCE_DEMOGRAPHICS: AudienceDemographics = {
  session_id: 'all',
  gender_male_pct: 58,
  gender_female_pct: 38,
  gender_other_pct: 4,
  age_groups: [
    { range: '13-17', count: 85 },
    { range: '18-24', count: 320 },
    { range: '25-34', count: 410 },
    { range: '35-44', count: 180 },
    { range: '45-54', count: 65 },
    { range: '55+',   count: 20 },
  ],
  top_cities: [
    { city: 'Hà Nội',          count: 420 },
    { city: 'TP. Hồ Chí Minh', count: 380 },
    { city: 'Đà Nẵng',         count: 120 },
    { city: 'Khác',             count: 160 },
  ],
};

/** Recent orders table — for Admin Dashboard "Giao dịch gần đây" */
export const RECENT_ORDERS = [
  { id: 'ORD-8821', user: 'Nguyễn Văn A', event: 'Sky Tour 2026',        tickets: 2, amount: 4200000,  time: '2 phút trước' },
  { id: 'ORD-8820', user: 'Trần Thị B',   event: 'Rock Storm Festival',  tickets: 4, amount: 2940000,  time: '5 phút trước' },
  { id: 'ORD-8819', user: 'Lê Minh C',    event: 'Sky Tour 2026',        tickets: 1, amount: 2100000,  time: '8 phút trước' },
  { id: 'ORD-8818', user: 'Phạm Thu D',   event: 'Heartbeat Live',       tickets: 2, amount: 1470000,  time: '12 phút trước' },
  { id: 'ORD-8817', user: 'Hoàng Văn E',  event: 'Jazz on the River',    tickets: 3, amount: 3150000,  time: '18 phút trước' },
  { id: 'ORD-8816', user: 'Ngô Thị F',    event: 'All Star Gala',        tickets: 2, amount: 735000,   time: '25 phút trước' },
];
