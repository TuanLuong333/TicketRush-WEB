/**
 * TypeScript interfaces aligned with the actual database schema.
 * All field names mirror the DB columns to make API integration seamless.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'admin' | 'organizer';
export type UserGender = 'male' | 'female' | 'other';

export type EventStatus = 'draft' | 'on_sale' | 'sold_out' | 'cancelled' | 'ended';

/** price tier for a venue section / seat, mirrors event_seats.price_tier */
export type PriceTier = 'VIP' | 'STANDARD' | 'ECONOMY' | 'GENERAL';

/** persisted seat availability, mirrors event_seats.status */
export type SeatStatus = 'available' | 'locked' | 'sold';

/** client-only selection state; never persist `selected` to the database */
export type SeatViewStatus = SeatStatus | 'selected';

/** order status, mirrors orders.status */
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

/** ticket status, mirrors tickets.status */
export type TicketStatus = 'issued' | 'used' | 'cancelled';

/** queue entry status, mirrors queue_entries.status */
export type QueueEntryStatus = 'waiting' | 'serving' | 'done' | 'expired';

/** queue status, mirrors queue.status */
export type QueueStatus = 'inactive' | 'active' | 'paused' | 'ended';

// ─── Core Entities ────────────────────────────────────────────────────────────

/**
 * Mirrors the `users` table.
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  gender?: UserGender;
  birth_date?: string;     // DATE as ISO string
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

/**
 * Mirrors `event_seats` table. Each row = one physical seat.
 */
export interface EventSeat {
  id: string;
  event_id: string;
  section_name: string;   // e.g. "VIP", "A", "B", "GENERAL"
  seat_number: number;    // column number within the row
  row_label: string;      // e.g. "A", "B", "C"
  price_tier: PriceTier;
  price: number;          // VND
  status: SeatViewStatus;
}

/**
 * Aggregate of event_seats grouped by section — used for display in EventDetail
 * (price table) and SeatMap rendering. Not a DB table itself.
 */
export interface VenueSection {
  section_name: string;
  price_tier: PriceTier;
  price: number;
  color: string;           // UI only — for rendering seat map
  total_seats: number;
  sold_seats: number;
  rows: number;
  cols: number;
}

/**
 * Mirrors the `events` table.
 * `artist` is stored in `meta` JSONB in the DB; exposed here as a first-class field.
 * `sections` is a client-side aggregate (not a DB column) built from event_seats.
 */
export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  artist: string;          // from meta JSONB
  description: string;
  venue: string;
  city: string;
  date_start: string;      // ISO datetime string
  date_end: string;        // ISO datetime string
  banner_url: string;
  poster_url?: string;     // from DB events.poster_url
  venue_id?: string;       // from DB events.venue_id
  status: EventStatus;
  genres: string[];        // from meta JSONB
  sections: VenueSection[]; // client-side aggregate from event_seats
  total_seats: number;     // sum of section.total_seats
  sold_seats: number;      // sum of section.sold_seats
  has_queue: boolean;      // true if a queue row exists for this event (= flash sale)
  flash_sale_ends?: string; // from queue.ended_at when has_queue = true
  featured?: boolean;
  created_at: string;
}

/**
 * Mirrors the `order_items` table.
 */
export interface OrderItem {
  id: string;
  order_id: string;
  ticket_id: string;
  seat_label: string;       // e.g. "VIP - Hàng A, Ghế 3"
  section_name: string;
  row_label: string;
  seat_number: number;
  price_tier: PriceTier;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

/**
 * Mirrors the `orders` table.
 */
export interface Order {
  id: string;
  user_id: string;
  event_id: string;
  event_title: string;       // denormalized for display
  event_artist: string;
  event_date_start: string;
  event_venue: string;
  event_city: string;
  event_banner_url: string;
  payment_method: PaymentMethod;
  total_amount: number;
  service_fee: number;       // e.g. 5% of item total
  status: OrderStatus;
  booked_at: string;
  items: OrderItem[];        // joined from order_items
  tickets: Ticket[];         // joined from tickets
}

/**
 * Mirrors the `event_sessions` table.
 */
export interface EventSession {
  id: string;
  event_id: string;
  name: string;              // e.g. "Đêm 1", "Session B"
  start_at: string;
  end_at: string;
  status: EventStatus;
  queue_enabled: boolean;
  created_at: string;
}

export type PaymentMethod = 'VNPAY' | 'MOMO' | 'CARD' | 'CASH';

/**
 * Mirrors the `tickets` table.
 */
export interface Ticket {
  id: string;
  order_id: string;
  seat_id: string;
  qr_code: string;           // unique QR string for check-in
  status: TicketStatus;
  checkin_at?: string;
  created_at: string;
}

/**
 * Mirrors the `queue` table.
 */
export interface Queue {
  id: string;
  event_id: string;
  status: QueueStatus;
  max_capacity: number;
  server_number: number;     // current batch number being served
  started_at?: string;
  ended_at?: string;
}

/**
 * Mirrors the `queue_entries` table.
 */
export interface QueueEntry {
  id: string;
  queue_id: string;
  user_id: string;
  position: number;
  status: QueueEntryStatus;
  token: string;             // unique token shown to user
  joined_at: string;
  expires_at: string;
  served_at?: string;
}

// ─── Analytics Views ──────────────────────────────────────────────────────────

/**
 * Mirrors `va_session_revenue_summary` view.
 */
export interface SessionRevenueSummary {
  session_id: string;
  event_id: string;
  date: string;              // for charting (e.g. "T2", "01/04")
  total_revenue: number;
  total_tickets: number;
  avg_price_per_ticket: number;
  updated_at: string;
}

/**
 * Mirrors `va_session_audience_demographics` view.
 */
export interface AudienceDemographics {
  session_id: string;
  event_id?: string;
  gender_male_pct: number;
  gender_female_pct: number;
  gender_other_pct: number;
  age_groups: AgeGroup[];
  top_cities: CityCount[];
}

export interface AgeGroup {
  range: string;   // e.g. "18-24"
  count: number;
}

export interface CityCount {
  city: string;
  count: number;
}

// ─── UI-Only Helpers ───────────────────────────────────────────────────────────

/** Color mapping for price tiers (UI-only, not from DB) */
export const PRICE_TIER_CONFIG: Record<PriceTier, {
  color: string;
  textColor: string;
  label: string;
}> = {
  VIP:      { color: '#F59E0B', textColor: '#F59E0B', label: 'VIP' },
  STANDARD: { color: '#3B82F6', textColor: '#3B82F6', label: 'Tiêu Chuẩn' },
  ECONOMY:  { color: '#8B5CF6', textColor: '#8B5CF6', label: 'Phổ Thông' },
  GENERAL:  { color: '#6B7280', textColor: '#9CA3AF', label: 'Khu Đứng' },
};

/** Service fee rate (5%) */
export const SERVICE_FEE_RATE = 0.05;
