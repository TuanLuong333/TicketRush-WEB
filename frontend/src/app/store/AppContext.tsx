import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EVENTS,
  ORDER_ITEMS,
  ORDERS,
  QUEUE_ENTRIES,
  SEAT_LOCK_LOGS,
  SEAT_ZONES,
  SEATS,
  USERS,
  ZONE_LAYOUTS,
  generateSeats,
  getEventStats,
  getSeatZone as findSeatZone,
  getSeatsForEvent,
  getZonesForEvent,
  makeOrderCode,
  makeQueueToken,
} from '../data/mockData';
import type {
  Event,
  EventStats,
  Order,
  OrderItem,
  PaymentMethod,
  QueueEntry,
  Seat,
  SeatLockLog,
  SeatStatus,
  SeatViewStatus,
  SeatZone,
  User,
  ZoneLayout,
} from '../data/types';
import { apiClient, ApiError, isNetworkError } from '../api/client';
import {
  adaptEvent,
  adaptOrder,
  adaptOrderItem,
  adaptQueueEntry,
  adaptSeatMap,
  adaptUser,
} from '../api/adapters';

export type { User };

interface HoldResult {
  order: Order | null;
  queueRequired?: boolean;
  message?: string;
}

interface AppContextValue {
  user: User | null;
  apiReady: boolean;
  apiLoading: boolean;
  apiError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: Partial<User> & { password?: string }) => Promise<boolean>;
  updateUser: (data: Partial<User>) => void;

  events: Event[];
  seatZones: SeatZone[];
  seats: Seat[];
  orders: Order[];
  orderItems: OrderItem[];
  queueEntries: QueueEntry[];
  seatLockLogs: SeatLockLog[];
  getEvent: (id: string | number) => Event | undefined;
  getZones: (eventId: string | number) => SeatZone[];
  getSeats: (eventId: string | number) => Seat[];
  getSeatZone: (seat: Seat) => SeatZone | undefined;
  getStats: (eventId: string | number) => EventStats;
  addEvent: (event: Event, zones: SeatZone[], layouts: ZoneLayout[]) => Promise<Event | null>;
  deleteEvent: (eventId: number) => Promise<boolean>;
  publishEvent: (eventId: number) => Promise<boolean>;
  updateEventData: (eventId: number, data: Partial<Event>) => Promise<boolean>;
  refreshEvents: () => Promise<void>;
  refreshSeatMap: (eventId: string | number) => Promise<void>;
  refreshOrders: () => Promise<void>;

  selectSeat: (eventId: string | number, seatId: number) => void;
  deselectSeat: (eventId: string | number, seatId: number) => void;
  getUserSeats: (eventId: string | number) => Seat[];
  clearUserSeats: (eventId: string | number) => void;
  holdExpiry: Date | null;
  setHoldExpiry: (date: Date | null) => void;
  holdSeats: (eventId: string | number) => Promise<HoldResult>;
  activeOrderId: number | null;
  confirmOrder: (orderId: number, paymentMethod: PaymentMethod) => Promise<Order | null>;

  currentQueueEntry: QueueEntry | null;
  enterQueue: (eventId: string | number) => Promise<QueueEntry>;
  refreshQueueStatus: (eventId: string | number) => Promise<QueueEntry | null>;
  activateQueue: () => void;
  exitQueue: (eventId?: string | number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function asId(value: string | number | undefined): number {
  return Number(value ?? 0);
}

function hashPassword(password?: string): string {
  return `$2b$10$demo-${password ? password.length : 8}-hash`;
}

function nextId(items: { id: number }[], fallback: number): number {
  return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : fallback;
}

function mergeById<T extends { id: number }>(current: T[], incoming: T[]) {
  const map = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

function replaceEventSlice<T extends { id: number }>(current: T[], incoming: T[]) {
  return mergeById(current.filter(item => !incoming.some(next => next.id === item.id)), incoming);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [seatZones, setSeatZones] = useState<SeatZone[]>(SEAT_ZONES);
  const [, setZoneLayouts] = useState<ZoneLayout[]>(ZONE_LAYOUTS);
  const [seats, setSeats] = useState<Seat[]>(SEATS);
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(ORDER_ITEMS);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>(QUEUE_ENTRIES);
  const [seatLockLogs, setSeatLockLogs] = useState<SeatLockLog[]>(SEAT_LOCK_LOGS);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Record<number, Set<number>>>({});
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [currentQueueEntry, setCurrentQueueEntry] = useState<QueueEntry | null>(null);

  const applySeatMap = useCallback((eventId: number, zones: SeatZone[], layouts: ZoneLayout[], nextSeats: Seat[]) => {
    setSeatZones(prev => [...prev.filter(zone => zone.event_id !== eventId), ...zones]);
    setZoneLayouts(prev => [...prev.filter(layout => !zones.some(zone => zone.id === layout.zone_id)), ...layouts]);
    setSeats(prev => {
      const zoneIds = new Set(zones.map(zone => zone.id));
      return [...prev.filter(seat => !zoneIds.has(seat.zone_id)), ...nextSeats];
    });
  }, []);

  const refreshSeatMap = useCallback(async (eventIdInput: string | number) => {
    if (!apiReady) return;
    const eventId = asId(eventIdInput);
    const map = await apiClient.getSeatMap(eventId);
    const adapted = adaptSeatMap(eventId, map.zones);
    applySeatMap(eventId, adapted.zones, adapted.layouts, adapted.seats);
  }, [apiReady, applySeatMap]);

  const refreshEvents = useCallback(async () => {
    setApiLoading(true);
    try {
      await apiClient.health();
      const apiEvents = await apiClient.listAllEvents();
      const nextEvents = apiEvents.map(adaptEvent);
      setEvents(nextEvents);
      setApiReady(true);
      setApiError(null);

      const maps = await Promise.allSettled(nextEvents.map(event => apiClient.getSeatMap(event.id)));
      for (let index = 0; index < maps.length; index += 1) {
        const result = maps[index];
        if (result.status === 'fulfilled') {
          const adapted = adaptSeatMap(nextEvents[index].id, result.value.zones);
          applySeatMap(nextEvents[index].id, adapted.zones, adapted.layouts, adapted.seats);
        }
      }
    } catch (error) {
      setApiReady(false);
      setApiError(error instanceof Error ? error.message : 'Không kết nối được backend');
      setEvents(EVENTS);
      setSeatZones(SEAT_ZONES);
      setSeats(SEATS);
      setOrders(ORDERS);
      setOrderItems(ORDER_ITEMS);
    } finally {
      setApiLoading(false);
    }
  }, [applySeatMap]);

  const refreshOrders = useCallback(async () => {
    if (!apiReady || !apiClient.token) return;
    const response = await apiClient.listOrders();
    const details = await Promise.allSettled(response.data.map(order => apiClient.getOrder(order.id)));
    const nextOrders: Order[] = [];
    const nextItems: OrderItem[] = [];

    response.data.forEach((summary, index) => {
      const detail = details[index];
      if (detail.status === 'fulfilled') {
        nextOrders.push(adaptOrder(detail.value.order));
        nextItems.push(...detail.value.items.map((item, itemIndex) => adaptOrderItem(item, detail.value.order.id, itemIndex)));
      } else {
        nextOrders.push(adaptOrder(summary));
      }
    });

    setOrders(nextOrders);
    setOrderItems(nextItems);
  }, [apiReady]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    if (!apiReady || !apiClient.token) return;
    void apiClient.me()
      .then(({ user: apiUser }) => {
        const adapted = adaptUser(apiUser);
        setUser(adapted);
        if (adapted.role === 'customer') {
          return refreshOrders();
        }
      })
      .catch(() => apiClient.logout());
  }, [apiReady, refreshOrders]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;

    if (apiReady) {
      try {
        const result = await apiClient.login(email, password);
        const adapted = adaptUser(result.user);
        setUser(adapted);
        if (adapted.role === 'customer') {
          await refreshOrders();
        }
        return true;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    const existing = USERS.find(candidate => candidate.email.toLowerCase() === email.toLowerCase());
    const now = new Date().toISOString();
    setUser(existing ?? {
      id: Date.now(),
      full_name: email.includes('@') ? email.split('@')[0] : 'Khách hàng',
      email,
      password_hash: hashPassword(password),
      role: email.toLowerCase().includes('admin') ? 'admin' : 'customer',
      gender: 'other',
      dob: '2000-01-01',
      phone: '',
      created_at: now,
      updated_at: now,
    });
    return true;
  }, [apiReady, refreshOrders]);

  const logout = useCallback(() => {
    apiClient.logout();
    setUser(null);
    setCurrentQueueEntry(null);
    setHoldExpiry(null);
    setActiveOrderId(null);
    setSelectedSeatIds({});
  }, []);

  const register = useCallback(async (data: Partial<User> & { password?: string }): Promise<boolean> => {
    if (!data.full_name || !data.email || !data.password) return false;

    if (apiReady) {
      try {
        const result = await apiClient.register({
          fullName: data.full_name,
          email: data.email,
          password: data.password,
          gender: data.gender,
          dateOfBirth: data.dob,
          phone: data.phone,
        });
        const adapted = adaptUser(result.user);
        setUser(adapted);
        if (adapted.role === 'customer') {
          await refreshOrders();
        }
        return true;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    const now = new Date().toISOString();
    setUser({
      id: Date.now(),
      full_name: data.full_name,
      email: data.email,
      password_hash: hashPassword(data.password),
      role: 'customer',
      gender: data.gender ?? 'other',
      dob: data.dob ?? '2000-01-01',
      phone: data.phone ?? '',
      created_at: now,
      updated_at: now,
    });
    return true;
  }, [apiReady, refreshOrders]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data, updated_at: new Date().toISOString() } : null);
  }, []);

  const getEvent = useCallback((id: string | number) => {
    return events.find(event => event.id === asId(id));
  }, [events]);

  const getZones = useCallback((eventId: string | number) => {
    return getZonesForEvent(asId(eventId), seatZones);
  }, [seatZones]);

  const getSeats = useCallback((eventId: string | number) => {
    return getSeatsForEvent(asId(eventId), seats, seatZones);
  }, [seats, seatZones]);

  const getSeatZone = useCallback((seat: Seat) => {
    return findSeatZone(seat, seatZones);
  }, [seatZones]);

  const getStats = useCallback((eventId: string | number) => {
    const zones = getZones(eventId);
    const eventSeats = getSeats(eventId);
    return getEventStats(zones, eventSeats, orderItems);
  }, [getSeats, getZones, orderItems]);

  const addLog = useCallback((log: Omit<SeatLockLog, 'id' | 'created_at'>) => {
    setSeatLockLogs(prev => [
      ...prev,
      {
        ...log,
        id: nextId(prev, 10001),
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const addEvent = useCallback(async (event: Event, zones: SeatZone[], layouts: ZoneLayout[]) => {
    if (apiReady) {
      const created = await apiClient.createEvent({
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.event_time,
        saleStartTime: event.sale_start_time,
        saleEndTime: event.sale_end_time,
        status: event.status,
        bannerUrl: event.banner_url,
      });

      for (const zone of zones) {
        const layout = layouts.find(item => item.zone_id === zone.id);
        await apiClient.createZone(created.event.id, {
          name: zone.name,
          rowCount: layout?.rows || 1,
          seatsPerRow: layout?.cols || zone.total_capacity,
          price: zone.price,
          color: layout?.color,
        });
      }

      await apiClient.generateSeats(created.event.id);
      await refreshEvents();
      return adaptEvent(created.event);
    }

    setEvents(prev => [event, ...prev]);
    setSeatZones(prev => [...prev, ...zones]);
    setZoneLayouts(prev => [...prev, ...layouts]);
    setSeats(prev => [...prev, ...generateSeats(zones, layouts)]);
    return event;
  }, [apiReady, refreshEvents]);

  const deleteEventFn = useCallback(async (eventId: number): Promise<boolean> => {
    if (!apiReady) return false;
    await apiClient.deleteEvent(eventId);
    await refreshEvents();
    return true;
  }, [apiReady, refreshEvents]);

  const publishEventFn = useCallback(async (eventId: number): Promise<boolean> => {
    if (!apiReady) return false;
    await apiClient.publishEvent(eventId);
    await refreshEvents();
    return true;
  }, [apiReady, refreshEvents]);

  const updateEventData = useCallback(async (eventId: number, data: Partial<Event>): Promise<boolean> => {
    if (!apiReady) return false;
    await apiClient.updateEvent(eventId, {
      title: data.title,
      description: data.description,
      location: data.location,
      startTime: data.event_time,
      saleStartTime: data.sale_start_time,
      saleEndTime: data.sale_end_time,
      status: data.status,
      bannerUrl: data.banner_url,
    });
    await refreshEvents();
    return true;
  }, [apiReady, refreshEvents]);

  const selectSeat = useCallback((eventId: string | number, seatId: number) => {
    const numericEventId = asId(eventId);
    setSeats(prev => prev.map(seat =>
      seat.id === seatId && seat.status === 'available'
        ? { ...seat, status: 'selected' as SeatViewStatus, updated_at: new Date().toISOString() }
        : seat
    ));
    setSelectedSeatIds(prev => {
      const next = new Set(prev[numericEventId] ?? []);
      next.add(seatId);
      return { ...prev, [numericEventId]: next };
    });
  }, []);

  const deselectSeat = useCallback((eventId: string | number, seatId: number) => {
    const numericEventId = asId(eventId);
    setSeats(prev => prev.map(seat =>
      seat.id === seatId && seat.status === 'selected'
        ? { ...seat, status: 'available' as SeatStatus, updated_at: new Date().toISOString() }
        : seat
    ));
    setSelectedSeatIds(prev => {
      const next = new Set(prev[numericEventId] ?? []);
      next.delete(seatId);
      return { ...prev, [numericEventId]: next };
    });
  }, []);

  const getUserSeats = useCallback((eventId: string | number) => {
    const numericEventId = asId(eventId);
    const ids = selectedSeatIds[numericEventId] ?? new Set<number>();
    return getSeats(numericEventId).filter(seat => ids.has(seat.id));
  }, [getSeats, selectedSeatIds]);

  const clearUserSeats = useCallback((eventId: string | number) => {
    const numericEventId = asId(eventId);
    const ids = selectedSeatIds[numericEventId] ?? new Set<number>();
    setSeats(prev => prev.map(seat => {
      if (!ids.has(seat.id)) return seat;
      if (seat.status !== 'selected' && seat.status !== 'locked') return seat;
      return {
        ...seat,
        status: 'available' as SeatStatus,
        locked_by: undefined,
        lock_expires_at: undefined,
        updated_at: new Date().toISOString(),
      };
    }));
    if (user && !apiReady) {
      ids.forEach(seatId => addLog({
        seat_id: seatId,
        user_id: user.id,
        action: 'release',
        reason: 'User cleared selected seats',
      }));
    }
    setSelectedSeatIds(prev => ({ ...prev, [numericEventId]: new Set<number>() }));
    setHoldExpiry(null);
    setActiveOrderId(null);
  }, [addLog, apiReady, selectedSeatIds, user]);

  const holdSeats = useCallback(async (eventId: string | number): Promise<HoldResult> => {
    const numericEventId = asId(eventId);
    const ids = Array.from(selectedSeatIds[numericEventId] ?? new Set<number>());
    if (!ids.length || !user) return { order: null, message: 'Chưa chọn ghế hoặc chưa đăng nhập' };

    if (apiReady) {
      try {
        const result = await apiClient.lockSeats(numericEventId, ids);
        const order = adaptOrder(result.order);
        const items = result.items.map((item, index) => adaptOrderItem(item, order.id, index));
        setOrders(prev => replaceEventSlice(prev, [order]));
        setOrderItems(prev => [...prev.filter(item => item.order_id !== order.id), ...items]);
        setSeats(prev => prev.map(seat =>
          ids.includes(seat.id)
            ? {
                ...seat,
                status: 'locked' as SeatStatus,
                locked_by: user.id,
                lock_expires_at: order.expires_at,
                updated_at: new Date().toISOString(),
              }
            : seat
        ));
        setHoldExpiry(new Date(order.expires_at));
        setActiveOrderId(order.id);
        return { order };
      } catch (error) {
        const apiError = error instanceof ApiError ? error : null;
        const details = apiError?.details as { queueRequired?: boolean; queue?: unknown } | undefined;
        if (details?.queueRequired) {
          return { order: null, queueRequired: true, message: apiError?.message };
        }
        throw error;
      }
    }

    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    const selectedSeats = getSeats(numericEventId).filter(seat => ids.includes(seat.id));
    const itemTotal = selectedSeats.reduce((sum, seat) => sum + (findSeatZone(seat, seatZones)?.price ?? 0), 0);
    const orderId = nextId(orders, 5001);
    const now = new Date().toISOString();
    const order: Order = {
      id: orderId,
      order_code: makeOrderCode(orderId),
      user_id: user.id,
      event_id: numericEventId,
      status: 'pending',
      total_amount: itemTotal,
      expires_at: expiry.toISOString(),
      created_at: now,
      updated_at: now,
    };
    const items = selectedSeats.map((seat, index) => ({
      id: nextId(orderItems, 7001) + index,
      order_id: order.id,
      seat_id: seat.id,
      price: findSeatZone(seat, seatZones)?.price ?? 0,
      created_at: now,
    }));

    setOrders(prev => [...prev, order]);
    setOrderItems(prev => [...prev, ...items]);
    setSeats(prev => prev.map(seat =>
      ids.includes(seat.id)
        ? {
            ...seat,
            status: 'locked' as SeatStatus,
            locked_by: user.id,
            lock_expires_at: expiry.toISOString(),
            updated_at: now,
          }
        : seat
    ));
    ids.forEach(seatId => addLog({
      seat_id: seatId,
      user_id: user.id,
      action: 'lock',
      reason: 'Checkout hold created',
    }));
    setHoldExpiry(expiry);
    setActiveOrderId(order.id);
    return { order };
  }, [addLog, apiReady, getSeats, orderItems, orders, seatZones, selectedSeatIds, user]);

  const confirmOrder = useCallback(async (orderId: number, paymentMethod: PaymentMethod): Promise<Order | null> => {
    const order = orders.find(item => item.id === orderId);
    if (!order || !user) return null;

    if (apiReady) {
      const result = await apiClient.confirmPayment(orderId, paymentMethod);
      const confirmed = adaptOrder(result.order, paymentMethod);
      const items = result.items.map((item, index) => adaptOrderItem(item, confirmed.id, index));
      setOrders(prev => prev.map(item => item.id === confirmed.id ? confirmed : item));
      setOrderItems(prev => [...prev.filter(item => item.order_id !== confirmed.id), ...items]);
      setSeats(prev => prev.map(seat =>
        items.some(item => item.seat_id === seat.id)
          ? { ...seat, status: 'sold' as SeatStatus, locked_by: undefined, lock_expires_at: undefined, updated_at: new Date().toISOString() }
          : seat
      ));
      setSelectedSeatIds(prev => ({ ...prev, [confirmed.event_id]: new Set<number>() }));
      setHoldExpiry(null);
      setActiveOrderId(null);
      await refreshOrders();
      return confirmed;
    }

    if (new Date(order.expires_at).getTime() <= Date.now()) return null;
    const items = orderItems.filter(item => item.order_id === orderId);
    const confirmed: Order = {
      ...order,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    };
    setOrders(prev => prev.map(item => item.id === orderId ? confirmed : item));
    setSeats(prev => prev.map(seat =>
      items.some(item => item.seat_id === seat.id)
        ? { ...seat, status: 'sold' as SeatStatus, locked_by: undefined, lock_expires_at: undefined, updated_at: confirmed.updated_at }
        : seat
    ));
    items.forEach(item => addLog({
      seat_id: item.seat_id,
      user_id: user.id,
      action: 'purchase',
      reason: `Order ${order.order_code} paid`,
    }));
    setSelectedSeatIds(prev => ({ ...prev, [order.event_id]: new Set<number>() }));
    setHoldExpiry(null);
    setActiveOrderId(null);
    return confirmed;
  }, [addLog, apiReady, orderItems, orders, refreshOrders, user]);

  const enterQueue = useCallback(async (eventId: string | number) => {
    const numericEventId = asId(eventId);
    if (apiReady && user) {
      const result = await apiClient.joinQueue(numericEventId);
      const entry = adaptQueueEntry(result, numericEventId, user.id);
      setQueueEntries(prev => mergeById(prev, [entry]));
      setCurrentQueueEntry(entry);
      return entry;
    }

    const position = Math.floor(Math.random() * 80) + 40;
    const now = new Date().toISOString();
    const entry: QueueEntry = {
      id: nextId(queueEntries, 9001),
      event_id: numericEventId,
      user_id: user?.id ?? 0,
      queue_token: makeQueueToken(numericEventId),
      status: 'waiting',
      position_number: position,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      created_at: now,
    };
    setQueueEntries(prev => [...prev, entry]);
    setCurrentQueueEntry(entry);
    return entry;
  }, [apiReady, queueEntries, user]);

  const refreshQueueStatus = useCallback(async (eventId: string | number) => {
    const numericEventId = asId(eventId);
    if (!apiReady || !user) return currentQueueEntry;
    const result = await apiClient.getQueueStatus(numericEventId);
    const entry = adaptQueueEntry(result, numericEventId, user.id);
    setCurrentQueueEntry(entry);
    setQueueEntries(prev => mergeById(prev, [entry]));
    return entry;
  }, [apiReady, currentQueueEntry, user]);

  const activateQueue = useCallback(() => {
    setCurrentQueueEntry(prev => {
      if (!prev) return null;
      const next = {
        ...prev,
        status: 'active' as const,
        position_number: 0,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
      setQueueEntries(entries => entries.map(entry => entry.id === next.id ? next : entry));
      return next;
    });
  }, []);

  const exitQueue = useCallback(async (eventId?: string | number) => {
    if (apiReady && eventId) {
      await apiClient.leaveQueue(asId(eventId));
    }
    setCurrentQueueEntry(prev => {
      if (prev) {
        const next = { ...prev, status: 'completed' as const };
        setQueueEntries(entries => entries.map(entry => entry.id === next.id ? next : entry));
      }
      return null;
    });
  }, [apiReady]);

  const value = useMemo<AppContextValue>(() => ({
    user,
    apiReady,
    apiLoading,
    apiError,
    login,
    logout,
    register,
    updateUser,
    events,
    seatZones,
    seats,
    orders,
    orderItems,
    queueEntries,
    seatLockLogs,
    getEvent,
    getZones,
    getSeats,
    getSeatZone,
    getStats,
    addEvent,
    deleteEvent: deleteEventFn,
    publishEvent: publishEventFn,
    updateEventData,
    refreshEvents,
    refreshSeatMap,
    refreshOrders,
    selectSeat,
    deselectSeat,
    getUserSeats,
    clearUserSeats,
    holdExpiry,
    setHoldExpiry,
    holdSeats,
    activeOrderId,
    confirmOrder,
    currentQueueEntry,
    enterQueue,
    refreshQueueStatus,
    activateQueue,
    exitQueue,
  }), [
    user,
    apiReady,
    apiLoading,
    apiError,
    login,
    logout,
    register,
    updateUser,
    events,
    seatZones,
    seats,
    orders,
    orderItems,
    queueEntries,
    seatLockLogs,
    getEvent,
    getZones,
    getSeats,
    getSeatZone,
    getStats,
    addEvent,
    deleteEventFn,
    publishEventFn,
    updateEventData,
    refreshEvents,
    refreshSeatMap,
    refreshOrders,
    selectSeat,
    deselectSeat,
    getUserSeats,
    clearUserSeats,
    holdExpiry,
    holdSeats,
    activeOrderId,
    confirmOrder,
    currentQueueEntry,
    enterQueue,
    refreshQueueStatus,
    activateQueue,
    exitQueue,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
