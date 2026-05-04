import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { EVENTS, DEMO_ORDER, generateSeats } from '../data/mockData';
import { SERVICE_FEE_RATE } from '../data/types';
import type {
  User, Event, EventSeat, Order, OrderItem, Ticket,
  QueueEntry, SeatStatus, SeatViewStatus, PaymentMethod,
} from '../data/types';

export type { User };

interface AppContextValue {
  // Auth
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (data: Partial<User> & { password?: string }) => boolean;
  updateUser: (data: Partial<User>) => void;

  // Events
  events: Event[];
  getEvent: (id: string) => Event | undefined;
  addEvent: (event: Event) => void;

  // Seats (mirrors event_seats table)
  seatMap: Record<string, EventSeat[]>;
  getSeats: (eventId: string) => EventSeat[];
  selectSeat: (eventId: string, seatId: string) => void;
  deselectSeat: (eventId: string, seatId: string) => void;
  getUserSeats: (eventId: string) => EventSeat[];
  clearUserSeats: (eventId: string) => void;

  // Hold timer (mirrors queue_entries.expires_at)
  holdExpiry: Date | null;
  setHoldExpiry: (d: Date | null) => void;
  holdSeats: (eventId: string) => void;

  // Orders (mirrors orders table)
  orders: Order[];
  confirmOrder: (eventId: string, paymentMethod: PaymentMethod) => Order | null;

  // Virtual Queue (mirrors queue + queue_entries tables)
  queueActive: boolean;
  queueEventId: string | null;
  queuePosition: number;
  queueToken: string | null;
  queueEntry: QueueEntry | null;
  enterQueue: (eventId: string) => void;
  exitQueue: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Helper ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  return 'TKN-' + Math.random().toString(36).toUpperCase().slice(2, 10);
}

function generateQRCode(orderId: string, ticketId: string): string {
  return `TR:${orderId}:${ticketId}`;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [seatMap, setSeatMap] = useState<Record<string, EventSeat[]>>({});
  const [userSeatIds, setUserSeatIds] = useState<Record<string, Set<string>>>({});
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [orders, setOrders] = useState<Order[]>([DEMO_ORDER]);

  // Queue state — mirrors queue_entries row for current user
  const [queueActive, setQueueActive] = useState(false);
  const [queueEventId, setQueueEventId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueToken, setQueueToken] = useState<string | null>(null);
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);

  // Initialize seat maps for all events from sections
  useEffect(() => {
    const map: Record<string, EventSeat[]> = {};
    for (const ev of EVENTS) {
      map[ev.id] = generateSeats(ev.id, ev.sections);
    }
    setSeatMap(map);
  }, []);

  // Simulate real-time seat updates (other users buying seats)
  useEffect(() => {
    const interval = setInterval(() => {
      setSeatMap(prev => {
        const updated = { ...prev };
        for (const eventId of Object.keys(updated)) {
          const seats = [...updated[eventId]];
          const userIds = userSeatIds[eventId] ?? new Set();
          const available = seats.filter(s => s.status === 'available' && !userIds.has(s.id));
          if (available.length > 0) {
            const pick = available[Math.floor(Math.random() * Math.min(available.length, 5))];
            const idx = seats.findIndex(s => s.id === pick.id);
            if (idx >= 0) seats[idx] = { ...pick, status: 'locked' };
          }
          const otherLocked = seats.filter(s => s.status === 'locked' && !userIds.has(s.id));
          if (otherLocked.length > 0 && Math.random() < 0.3) {
            const pick = otherLocked[Math.floor(Math.random() * otherLocked.length)];
            const idx = seats.findIndex(s => s.id === pick.id);
            if (idx >= 0) seats[idx] = { ...pick, status: 'available' };
          }
          updated[eventId] = seats;
        }
        return updated;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [userSeatIds]);

  // ─── Auth ──────────────────────────────────────────────────────────────────

  const login = useCallback((email: string, password: string): boolean => {
    if (!email || !password) return false;
    const isAdmin = email.toLowerCase().includes('admin');
    const now = new Date().toISOString();
    setUser({
      id: isAdmin ? 'admin-001' : 'user-' + Date.now(),
      email,
      full_name: isAdmin ? 'Admin' : email.split('@')[0],
      role: isAdmin ? 'admin' : 'customer',
      created_at: now,
    });
    return true;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const register = useCallback((data: Partial<User> & { password?: string }): boolean => {
    if (!data.full_name || !data.email) return false;
    const now = new Date().toISOString();
    setUser({ 
      id: 'user-' + Date.now(), 
      email: data.email, 
      full_name: data.full_name, 
      phone: data.phone,
      gender: data.gender,
      birth_date: data.birth_date,
      role: 'customer', 
      created_at: now 
    });
    return true;
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  }, []);

  // ─── Events ────────────────────────────────────────────────────────────────

  const getEvent = useCallback((id: string) => events.find(e => e.id === id), [events]);

  const addEvent = useCallback((event: Event) => {
    setEvents(prev => [event, ...prev]);
    setSeatMap(prev => ({
      ...prev,
      [event.id]: generateSeats(event.id, event.sections),
    }));
  }, []);

  // ─── Seats ─────────────────────────────────────────────────────────────────

  const getSeats = useCallback((eventId: string): EventSeat[] => seatMap[eventId] ?? [], [seatMap]);

  const selectSeat = useCallback((eventId: string, seatId: string) => {
    setSeatMap(prev => {
      const seats = prev[eventId]?.map(s =>
        s.id === seatId && s.status === 'available' ? { ...s, status: 'selected' as SeatViewStatus } : s
      ) ?? [];
      return { ...prev, [eventId]: seats };
    });
    setUserSeatIds(prev => {
      const set = new Set(prev[eventId] ?? []);
      set.add(seatId);
      return { ...prev, [eventId]: set };
    });
  }, []);

  const deselectSeat = useCallback((eventId: string, seatId: string) => {
    setSeatMap(prev => {
      const seats = prev[eventId]?.map(s =>
        s.id === seatId && s.status === 'selected' ? { ...s, status: 'available' as SeatStatus } : s
      ) ?? [];
      return { ...prev, [eventId]: seats };
    });
    setUserSeatIds(prev => {
      const set = new Set(prev[eventId] ?? []);
      set.delete(seatId);
      return { ...prev, [eventId]: set };
    });
  }, []);

  const getUserSeats = useCallback((eventId: string): EventSeat[] => {
    const ids = userSeatIds[eventId] ?? new Set();
    return (seatMap[eventId] ?? []).filter(s => ids.has(s.id));
  }, [seatMap, userSeatIds]);

  const clearUserSeats = useCallback((eventId: string) => {
    const ids = userSeatIds[eventId] ?? new Set();
    setSeatMap(prev => {
      const seats = prev[eventId]?.map(s =>
        ids.has(s.id) && (s.status === 'selected' || s.status === 'locked')
          ? { ...s, status: 'available' as SeatStatus }
          : s
      ) ?? [];
      return { ...prev, [eventId]: seats };
    });
    setUserSeatIds(prev => ({ ...prev, [eventId]: new Set() }));
    setHoldExpiry(null);
  }, [userSeatIds]);

  const holdSeats = useCallback((eventId: string) => {
    const ids = userSeatIds[eventId] ?? new Set();
    setSeatMap(prev => {
      const seats = prev[eventId]?.map(s =>
        ids.has(s.id) && s.status === 'selected' ? { ...s, status: 'locked' as SeatStatus } : s
      ) ?? [];
      return { ...prev, [eventId]: seats };
    });
    setHoldExpiry(new Date(Date.now() + 10 * 60 * 1000));
  }, [userSeatIds]);

  // ─── Orders (confirmOrder replaces confirmBooking) ─────────────────────────

  const confirmOrder = useCallback((eventId: string, paymentMethod: PaymentMethod = 'VNPAY'): Order | null => {
    const event = events.find(e => e.id === eventId);
    if (!event || !user) return null;
    if (!holdExpiry || holdExpiry.getTime() <= Date.now()) return null;

    const ids = userSeatIds[eventId] ?? new Set();
    const userSeats = (seatMap[eventId] ?? []).filter(s => ids.has(s.id));
    if (userSeats.length === 0) return null;
    if (userSeats.some(seat => seat.status !== 'locked')) return null;

    const orderId = 'ORD-' + Date.now().toString().slice(-6);
    const now = new Date().toISOString();

    // Build order_items + tickets
    const items: OrderItem[] = userSeats.map((seat, i) => {
      const ticketId = `tkt-${orderId}-${i + 1}`;
      return {
        id: `item-${orderId}-${i + 1}`,
        order_id: orderId,
        ticket_id: ticketId,
        seat_label: `${seat.section_name} - Hàng ${seat.row_label}, Ghế ${seat.seat_number}`,
        section_name: seat.section_name,
        row_label: seat.row_label,
        seat_number: seat.seat_number,
        price_tier: seat.price_tier,
        quantity: 1,
        unit_price: seat.price,
        subtotal: seat.price,
      };
    });

    const tickets: Ticket[] = userSeats.map((_, i) => ({
      id: `tkt-${orderId}-${i + 1}`,
      order_id: orderId,
      seat_id: userSeats[i].id,
      qr_code: generateQRCode(orderId, `tkt-${orderId}-${i + 1}`),
      status: 'issued' as const,
      created_at: now,
    }));

    const itemTotal = items.reduce((s, it) => s + it.subtotal, 0);
    const service_fee = Math.round(itemTotal * SERVICE_FEE_RATE);

    const order: Order = {
      id: orderId,
      user_id: user.id,
      event_id: eventId,
      event_title: event.title,
      event_artist: event.artist,
      event_date_start: event.date_start,
      event_venue: event.venue,
      event_city: event.city,
      event_banner_url: event.banner_url,
      payment_method: paymentMethod,
      total_amount: itemTotal + service_fee,
      service_fee,
      status: 'confirmed',
      booked_at: now,
      items,
      tickets,
    };

    // Mark seats as sold
    setSeatMap(prev => {
      const seats = prev[eventId]?.map(s =>
        ids.has(s.id) ? { ...s, status: 'sold' as SeatStatus } : s
      ) ?? [];
      return { ...prev, [eventId]: seats };
    });
    setUserSeatIds(prev => ({ ...prev, [eventId]: new Set() }));
    setOrders(prev => [...prev, order]);
    setHoldExpiry(null);
    return order;
  }, [events, holdExpiry, seatMap, userSeatIds, user]);

  // ─── Queue (mirrors queue_entries table) ───────────────────────────────────

  const enterQueue = useCallback((eventId: string) => {
    const position = Math.floor(Math.random() * 80) + 40;
    const token = generateToken();
    const now = new Date().toISOString();
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    const entry: QueueEntry = {
      id: 'qe-' + Date.now(),
      queue_id: 'q-' + eventId,
      user_id: user?.id ?? 'guest',
      position,
      status: 'waiting',
      token,
      joined_at: now,
      expires_at,
    };
    setQueueEventId(eventId);
    setQueuePosition(position);
    setQueueToken(token);
    setQueueEntry(entry);
    setQueueActive(true);
  }, [user]);

  const exitQueue = useCallback(() => {
    setQueueActive(false);
    setQueueEventId(null);
    setQueuePosition(0);
    setQueueToken(null);
    setQueueEntry(null);
  }, []);

  return (
    <AppContext.Provider value={{
      user, login, logout, register, updateUser,
      events, getEvent, addEvent,
      seatMap, getSeats, selectSeat, deselectSeat, getUserSeats, clearUserSeats,
      holdExpiry, setHoldExpiry, holdSeats,
      orders, confirmOrder,
      queueActive, queueEventId, queuePosition, queueToken, queueEntry,
      enterQueue, exitQueue,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
