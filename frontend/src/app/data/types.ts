export type UserRole = 'customer' | 'admin';
export type UserGender = 'male' | 'female' | 'other';

export type EventStatus = 'draft' | 'on_sale' | 'paused' | 'sold_out' | 'ended' | 'cancelled';
export type SeatStatus = 'available' | 'locked' | 'sold';
export type SeatViewStatus = SeatStatus | 'selected';
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'expired' | 'refunded';
export type QueueEntryStatus = 'waiting' | 'active' | 'completed' | 'expired';
export type SeatLockAction = 'lock' | 'release' | 'purchase' | 'expire';
export type PaymentMethod = 'VNPAY' | 'MOMO' | 'CARD' | 'CASH';

export interface User {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  gender: UserGender;
  dob: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  event_time: string;
  seat_plan: string;
  seat_map_image_url?: string;
  sale_start_time: string;
  sale_end_time: string;
  status: EventStatus;
  banner_url: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SeatZone {
  id: number;
  event_id: number;
  name: string;
  price: number;
  total_capacity: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Seat {
  id: number;
  zone_id: number;
  row_label: string;
  seat_number: number;
  status: SeatViewStatus;
  locked_by?: number;
  lock_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  order_code: string;
  user_id: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  event_id: number;
  status: OrderStatus;
  total_amount: number;
  item_count?: number;
  expires_at: string;
  paid_at?: string;
  payment_method?: PaymentMethod;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  seat_id: number;
  price: number;
  created_at: string;
}

export interface QueueEntry {
  id: number;
  event_id: number;
  user_id: number;
  queue_token: string;
  status: QueueEntryStatus;
  position_number: number;
  activated_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface SeatLockLog {
  id: number;
  seat_id: number;
  user_id: number;
  action: SeatLockAction;
  reason: string;
  created_at: string;
}

export interface ZoneLayout {
  zone_id: number;
  rows: number;
  cols: number;
  color: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface ZoneStats {
  zone_id: number;
  name: string;
  price: number;
  total_capacity: number;
  available: number;
  locked: number;
  sold: number;
  selected: number;
  color: string;
}

export interface EventStats {
  total_capacity: number;
  available: number;
  locked: number;
  sold: number;
  selected: number;
  min_price: number;
  revenue: number;
  occupancy_pct: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface AdminRevenuePoint {
  label: string;
  revenue: number;
  tickets: number;
}

export interface AudienceStatistics {
  gender: Array<{ gender: string; total: number }>;
  age: Array<{ ageGroup: string; total: number }>;
}

export const SERVICE_FEE_RATE = 0.05;
export const AUTO_QUEUE_THRESHOLD = 50;
export const AUTO_QUEUE_MARKER = `queue:${AUTO_QUEUE_THRESHOLD}`;

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Sắp mở bán',
  on_sale: 'Đang bán',
  paused: 'Tạm dừng',
  sold_out: 'Hết vé',
  ended: 'Đã kết thúc',
  cancelled: 'Đã hủy',
};

export const STATUS_LABELS_EN: Record<EventStatus, string> = {
  draft: 'Coming soon',
  on_sale: 'On sale',
  paused: 'Paused',
  sold_out: 'Sold out',
  ended: 'Ended',
  cancelled: 'Cancelled',
};

export function getEventStatusLabel(status: EventStatus, language: 'vi' | 'en' = 'vi'): string {
  return language === 'en' ? STATUS_LABELS_EN[status] : STATUS_LABELS[status];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
  refunded: 'Đã hoàn tiền',
};

export const ORDER_STATUS_LABELS_EN: Record<OrderStatus, string> = {
  pending: 'Pending payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  expired: 'Expired',
  refunded: 'Refunded',
};

export function getOrderStatusLabel(status: OrderStatus, language: 'vi' | 'en' = 'vi'): string {
  return language === 'en' ? ORDER_STATUS_LABELS_EN[status] : ORDER_STATUS_LABELS[status];
}

export const QUEUE_STATUS_LABELS: Record<QueueEntryStatus, string> = {
  waiting: 'Đang chờ',
  active: 'Được vào chọn ghế',
  completed: 'Đã hoàn tất',
  expired: 'Hết hạn',
};

export const QUEUE_STATUS_LABELS_EN: Record<QueueEntryStatus, string> = {
  waiting: 'Waiting',
  active: 'Ready to select seats',
  completed: 'Completed',
  expired: 'Expired',
};

export function getQueueStatusLabel(status: QueueEntryStatus, language: 'vi' | 'en' = 'vi'): string {
  return language === 'en' ? QUEUE_STATUS_LABELS_EN[status] : QUEUE_STATUS_LABELS[status];
}

export const SEAT_STATUS_LABELS: Record<SeatViewStatus, string> = {
  available: 'Còn trống',
  locked: 'Đang giữ',
  sold: 'Đã bán',
  selected: 'Đang chọn',
};

export const SEAT_STATUS_LABELS_EN: Record<SeatViewStatus, string> = {
  available: 'Available',
  locked: 'Held',
  sold: 'Sold',
  selected: 'Selected',
};

export function getSeatStatusLabel(status: SeatViewStatus, language: 'vi' | 'en' = 'vi'): string {
  return language === 'en' ? SEAT_STATUS_LABELS_EN[status] : SEAT_STATUS_LABELS[status];
}
