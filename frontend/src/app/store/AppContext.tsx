import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  applySeatPlanLayouts,
} from '../data/mockData';
import { AUTO_QUEUE_THRESHOLD } from '../data/types';
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
  adminOrdersAvailable: boolean | null;
  login: (email: string, password: string) => Promise<User | null>;
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
  getZoneLayout: (zoneId: string | number) => ZoneLayout | undefined;
  getStats: (eventId: string | number) => EventStats;
  addEvent: (event: Event, zones: SeatZone[], layouts: ZoneLayout[]) => Promise<Event | null>;
  deleteEvent: (eventId: number) => Promise<boolean>;
  publishEvent: (eventId: number) => Promise<boolean>;
  updateEventData: (eventId: number, data: Partial<Event>, zones?: SeatZone[], layouts?: ZoneLayout[]) => Promise<boolean>;
  refreshEvents: () => Promise<void>;
  refreshSeatMap: (eventId: string | number) => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshAdminOrders: () => Promise<void>;

  selectSeat: (eventId: string | number, seatId: number) => void;
  deselectSeat: (eventId: string | number, seatId: number) => void;
  getUserSeats: (eventId: string | number) => Seat[];
  clearUserSeats: (eventId: string | number) => void;
  holdExpiry: Date | null;
  setHoldExpiry: (date: Date | null) => void;
  holdSeats: (eventId: string | number) => Promise<HoldResult>;
  cancelHeldSeats: (eventId: string | number, orderId?: number | null) => Promise<boolean>;
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

const LOCAL_BANNERS_KEY = 'ticketrush.localBanners';
const LOCAL_SEAT_MAPS_KEY = 'ticketrush.localSeatMaps';

function isInlineImage(value?: string | null): value is string {
  return Boolean(value?.startsWith('data:image/'));
}

function readLocalBanners(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_BANNERS_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function saveLocalBanner(eventId: number, bannerUrl?: string | null) {
  if (!isInlineImage(bannerUrl) || typeof window === 'undefined') return;
  try {
    const banners = readLocalBanners();
    banners[String(eventId)] = bannerUrl;
    window.localStorage.setItem(LOCAL_BANNERS_KEY, JSON.stringify(banners));
  } catch {
    // The in-memory event state still shows the banner even if localStorage quota is full.
  }
}


function readLocalSeatMaps(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_SEAT_MAPS_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function saveLocalSeatMap(eventId: number, seatMapUrl?: string | null) {
  if (!isInlineImage(seatMapUrl) || typeof window === 'undefined') return;
  try {
    const seatMaps = readLocalSeatMaps();
    seatMaps[String(eventId)] = seatMapUrl;
    window.localStorage.setItem(LOCAL_SEAT_MAPS_KEY, JSON.stringify(seatMaps));
  } catch {
    // The in-memory event state still shows the seat map even if localStorage quota is full.
  }
}

function applyLocalBanner(event: Event): Event {
  const eventId = String(event.id);
  const banner = readLocalBanners()[eventId];
  const seatMap = readLocalSeatMaps()[eventId];
  return {
    ...event,
    ...(banner ? { banner_url: banner } : {}),
    ...(seatMap ? { seat_map_image_url: seatMap } : {}),
  };
}

function extractSeatMapImageUrl(payload: {
  event?: { seatMapImageUrl?: string | null; seat_map_image_url?: string | null };
  seatMapImageUrl?: string | null;
  seat_map_image_url?: string | null;
}): string | undefined {
  return payload.event?.seatMapImageUrl || payload.event?.seat_map_image_url || payload.seatMapImageUrl || payload.seat_map_image_url || undefined;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [adminOrdersAvailable, setAdminOrdersAvailable] = useState<boolean | null>(null);
  const [events, setEvents] = useState<Event[]>(() => EVENTS.map(applyLocalBanner));
  const [seatZones, setSeatZones] = useState<SeatZone[]>(SEAT_ZONES);
  const [zoneLayouts, setZoneLayouts] = useState<ZoneLayout[]>(ZONE_LAYOUTS);
  const [seats, setSeats] = useState<Seat[]>(SEATS);
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(ORDER_ITEMS);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>(QUEUE_ENTRIES);
  const [seatLockLogs, setSeatLockLogs] = useState<SeatLockLog[]>(SEAT_LOCK_LOGS);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Record<number, Set<number>>>({});
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [currentQueueEntry, setCurrentQueueEntry] = useState<QueueEntry | null>(null);
  const holdExpiryRef = useRef<Date | null>(null);
  const activeOrderIdRef = useRef<number | null>(null);

  useEffect(() => {
    holdExpiryRef.current = holdExpiry;
    activeOrderIdRef.current = activeOrderId;
  }, [activeOrderId, holdExpiry]);

  useEffect(() => {
    const releaseExpiredLocks = () => {
      const now = Date.now();
      setSeats(prev => prev.map(seat => {
        if (seat.status !== 'locked' || !seat.lock_expires_at) return seat;
        if (new Date(seat.lock_expires_at).getTime() > now) return seat;
        return {
          ...seat,
          status: 'available' as SeatStatus,
          locked_by: undefined,
          lock_expires_at: undefined,
          updated_at: new Date().toISOString(),
        };
      }));
      setOrders(prev => prev.map(order => (
        order.status === 'pending' && new Date(order.expires_at).getTime() <= now
          ? { ...order, status: 'expired' as const, updated_at: new Date().toISOString() }
          : order
      )));
    };

    releaseExpiredLocks();
    const timer = window.setInterval(releaseExpiredLocks, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const applySeatMap = useCallback((eventId: number, zones: SeatZone[], layouts: ZoneLayout[], nextSeats: Seat[]) => {
    const now = Date.now();
    const normalizedSeats = nextSeats.map(seat => {
      const lockExpiry = seat.lock_expires_at ? new Date(seat.lock_expires_at).getTime() : Number.POSITIVE_INFINITY;
      if (seat.status === 'locked' && lockExpiry <= now) {
        return { ...seat, status: 'available' as SeatStatus, locked_by: undefined, lock_expires_at: undefined };
      }
      return seat;
    });
    setSeatZones(prev => [...prev.filter(zone => zone.event_id !== eventId), ...zones]);
    setZoneLayouts(prev => [...prev.filter(layout => !zones.some(zone => zone.id === layout.zone_id)), ...layouts]);
    setSeats(prev => {
      const zoneIds = new Set(zones.map(zone => zone.id));
      const localSelected = new Map(prev.filter(seat => seat.status === 'selected').map(seat => [seat.id, seat]));
      const mergedSeats = normalizedSeats.map(seat => {
        const selected = localSelected.get(seat.id);
        return selected && seat.status === 'available' ? { ...seat, status: 'selected' as SeatViewStatus } : seat;
      });
      return [...prev.filter(seat => !zoneIds.has(seat.zone_id)), ...mergedSeats];
    });
    setSelectedSeatIds(prev => {
      const current = prev[eventId];
      if (!current) return prev;
      const currentHoldExpiry = holdExpiryRef.current;
      const currentActiveOrderId = activeOrderIdRef.current;
      const keepableSeatIds = new Set(normalizedSeats.filter(seat => (
        seat.status === 'available' ||
        (seat.status === 'locked' && currentActiveOrderId && currentHoldExpiry && currentHoldExpiry.getTime() > Date.now())
      )).map(seat => seat.id));
      const next = new Set(Array.from(current).filter(seatId => keepableSeatIds.has(seatId)));
      return next.size === current.size ? prev : { ...prev, [eventId]: next };
    });
  }, []);

  const refreshSeatMap = useCallback(async (eventIdInput: string | number) => {
    if (!apiReady) return;
    const eventId = asId(eventIdInput);
    const map = await apiClient.getSeatMap(eventId);
    const seatMapImageUrl = extractSeatMapImageUrl(map);
    if (seatMapImageUrl) {
      setEvents(prev => prev.map(event => (
        event.id === eventId ? applyLocalBanner({ ...event, seat_map_image_url: seatMapImageUrl }) : event
      )));
    }
    const adapted = adaptSeatMap(eventId, map.zones);
    const event = events.find(item => item.id === eventId);
    const layouts = event ? applySeatPlanLayouts(adapted.layouts, adapted.zones, event.seat_plan) : adapted.layouts;
    applySeatMap(eventId, adapted.zones, layouts, adapted.seats);
  }, [apiReady, applySeatMap, events]);

  const refreshEvents = useCallback(async () => {
    setApiLoading(true);
    try {
      await apiClient.health();
      const apiEvents = await apiClient.listAllEvents();
      const nextEvents = apiEvents.map(adaptEvent).map(applyLocalBanner);
      setEvents(nextEvents);
      setOrders([]);
      setOrderItems([]);
      setAdminOrdersAvailable(null);
      setApiReady(true);
      setApiError(null);

      const maps = await Promise.allSettled(nextEvents.map(event => apiClient.getSeatMap(event.id)));
      for (let index = 0; index < maps.length; index += 1) {
        const result = maps[index];
        if (result.status === 'fulfilled') {
          const seatMapImageUrl = extractSeatMapImageUrl(result.value);
          if (seatMapImageUrl) {
            setEvents(prev => prev.map(event => (
              event.id === nextEvents[index].id ? applyLocalBanner({ ...event, seat_map_image_url: seatMapImageUrl }) : event
            )));
          }
          const adapted = adaptSeatMap(nextEvents[index].id, result.value.zones);
          const layouts = applySeatPlanLayouts(adapted.layouts, adapted.zones, nextEvents[index].seat_plan);
          applySeatMap(nextEvents[index].id, adapted.zones, layouts, adapted.seats);
        }
      }
    } catch (error) {
      setApiReady(false);
      setApiError(error instanceof Error ? error.message : 'Không kết nối được backend');
      setEvents(EVENTS.map(applyLocalBanner));
      setSeatZones(SEAT_ZONES);
      setSeats(SEATS);
      setOrders(ORDERS);
      setOrderItems(ORDER_ITEMS);
      setAdminOrdersAvailable(null);
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

  const refreshAdminOrders = useCallback(async () => {
    if (!apiReady || !apiClient.token) return;

    try {
      const response = await apiClient.listAdminOrders();
      const details = await Promise.allSettled(response.data.map(order => apiClient.getAdminOrder(order.id)));
      const nextOrders: Order[] = [];
      const nextItems: OrderItem[] = [];

      response.data.forEach((summary, index) => {
        const detail = details[index];
        if (detail.status === 'fulfilled') {
          nextOrders.push(adaptOrder({
            ...summary,
            ...detail.value.order,
            customer: detail.value.order.customer || summary.customer,
            user: detail.value.order.user || summary.user,
            event: detail.value.order.event || summary.event,
          }));
          nextItems.push(...detail.value.items.map((item, itemIndex) => adaptOrderItem(item, detail.value.order.id, itemIndex)));
        } else {
          nextOrders.push(adaptOrder(summary));
        }
      });

      setOrders(nextOrders);
      setOrderItems(nextItems);
      setAdminOrdersAvailable(true);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setOrders([]);
      setOrderItems([]);
      setAdminOrdersAvailable(apiError?.status === 404 || apiError?.status === 403 ? false : null);
    }
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
        return refreshAdminOrders();
      })
      .catch(() => apiClient.logout());
  }, [apiReady, refreshAdminOrders, refreshOrders]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    if (!email || !password) return null;

    if (apiReady) {
      try {
        const result = await apiClient.login(email, password);
        const adapted = adaptUser(result.user);
        setUser(adapted);
        if (adapted.role === 'customer') {
          await refreshOrders();
        } else {
          await refreshAdminOrders();
        }
        return adapted;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    const existing = USERS.find(candidate => candidate.email.toLowerCase() === email.toLowerCase());
    const now = new Date().toISOString();
    const fallbackUser = existing ?? {
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
    };
    setUser(fallbackUser);
    return fallbackUser;
  }, [apiReady, refreshAdminOrders, refreshOrders]);

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

  const getZoneLayout = useCallback((zoneId: string | number) => {
    return zoneLayouts.find(layout => layout.zone_id === asId(zoneId));
  }, [zoneLayouts]);

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
    const localBanner = isInlineImage(event.banner_url) ? event.banner_url : null;
    const localSeatMap = isInlineImage(event.seat_map_image_url) ? event.seat_map_image_url : null;

    if (apiReady) {
      const created = await apiClient.createEvent({
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.event_time,
        saleStartTime: event.sale_start_time,
        saleEndTime: event.sale_end_time,
        status: event.status,
        bannerUrl: localBanner ? null : event.banner_url,
        seatPlan: event.seat_plan,
        seatPlanCode: event.seat_plan,
        seatMapImageUrl: localSeatMap ? null : event.seat_map_image_url ?? null,
        queueMode: 'AUTO',
        queueThreshold: AUTO_QUEUE_THRESHOLD,
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
      if (localBanner) saveLocalBanner(created.event.id, localBanner);
      if (localSeatMap) saveLocalSeatMap(created.event.id, localSeatMap);
      await refreshEvents();
      const adaptedFromApi = adaptEvent(created.event);
      const adapted = applyLocalBanner({
        ...adaptedFromApi,
        seat_plan: event.seat_plan,
        seat_map_image_url: localSeatMap || event.seat_map_image_url,
        banner_url: localBanner || event.banner_url || adaptedFromApi.banner_url,
      });
      setEvents(prev => prev.map(item => item.id === adapted.id ? { ...item, ...adapted } : item));
      return adapted;
    }

    if (localBanner) saveLocalBanner(event.id, localBanner);
    if (localSeatMap) saveLocalSeatMap(event.id, localSeatMap);
    setEvents(prev => [applyLocalBanner(event), ...prev]);
    setSeatZones(prev => [...prev, ...zones]);
    setZoneLayouts(prev => [...prev, ...layouts]);
    setSeats(prev => [...prev, ...generateSeats(zones, layouts)]);
    return event;
  }, [apiReady, refreshEvents]);

  const deleteEventFn = useCallback(async (eventId: number): Promise<boolean> => {
    if (apiReady) {
      await apiClient.deleteEvent(eventId);
      await refreshEvents();
      return true;
    }

    const zoneIds = new Set(seatZones.filter(zone => zone.event_id === eventId).map(zone => zone.id));
    setEvents(prev => prev.filter(event => event.id !== eventId));
    setSeatZones(prev => prev.filter(zone => zone.event_id !== eventId));
    setZoneLayouts(prev => prev.filter(layout => !zoneIds.has(layout.zone_id)));
    setSeats(prev => prev.filter(seat => !zoneIds.has(seat.zone_id)));
    setOrders(prev => prev.filter(order => order.event_id !== eventId));
    setQueueEntries(prev => prev.filter(entry => entry.event_id !== eventId));
    return true;
  }, [apiReady, refreshEvents, seatZones]);

  const publishEventFn = useCallback(async (eventId: number): Promise<boolean> => {
    if (apiReady) {
      await apiClient.publishEvent(eventId);
      await refreshEvents();
      return true;
    }

    setEvents(prev => prev.map(event =>
      event.id === eventId ? { ...event, status: 'on_sale', updated_at: new Date().toISOString() } : event
    ));
    return true;
  }, [apiReady, refreshEvents]);

  const updateEventData = useCallback(async (
    eventId: number,
    data: Partial<Event>,
    zones?: SeatZone[],
    layouts?: ZoneLayout[],
  ): Promise<boolean> => {
    let apiEventData: Partial<Event> = {};
    const localBanner = isInlineImage(data.banner_url) ? data.banner_url : null;
    const localSeatMap = isInlineImage(data.seat_map_image_url) ? data.seat_map_image_url : null;
    if (localBanner) saveLocalBanner(eventId, localBanner);
    if (localSeatMap) saveLocalSeatMap(eventId, localSeatMap);

    if (apiReady) {
      const updated = await apiClient.updateEvent(eventId, {
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: data.event_time,
        saleStartTime: data.sale_start_time,
        saleEndTime: data.sale_end_time,
        status: data.status,
        bannerUrl: localBanner ? undefined : data.banner_url,
        seatPlan: data.seat_plan,
        seatPlanCode: data.seat_plan,
        seatMapImageUrl: localSeatMap ? undefined : data.seat_map_image_url ?? null,
        queueMode: data.seat_plan ? 'AUTO' : undefined,
        queueThreshold: data.seat_plan ? AUTO_QUEUE_THRESHOLD : undefined,
      });
      apiEventData = adaptEvent(updated.event);
    }

    const updatedAt = new Date().toISOString();
    setEvents(prev => prev.map(event =>
      event.id === eventId
        ? applyLocalBanner({ ...event, ...apiEventData, ...data, updated_at: updatedAt })
        : event
    ));

    if (zones && layouts) {
      const oldZoneIds = new Set(seatZones.filter(zone => zone.event_id === eventId).map(zone => zone.id));
      const nextZoneIds = new Set(zones.map(zone => zone.id));
      setSeatZones(prev => [...prev.filter(zone => zone.event_id !== eventId), ...zones]);
      setZoneLayouts(prev => [
        ...prev.filter(layout => !oldZoneIds.has(layout.zone_id) && !nextZoneIds.has(layout.zone_id)),
        ...layouts,
      ]);
      setSeats(prev => [
        ...prev.filter(seat => !oldZoneIds.has(seat.zone_id) && !nextZoneIds.has(seat.zone_id)),
        ...generateSeats(zones, layouts),
      ]);
    }

    return true;
  }, [apiReady, seatZones]);

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

  const cancelHeldSeats = useCallback(async (eventId: string | number, orderIdInput?: number | null): Promise<boolean> => {
    const numericEventId = asId(eventId);
    const orderId = orderIdInput ?? activeOrderId;
    if (!orderId || !user) return false;

    const currentItems = orderItems.filter(item => item.order_id === orderId);
    const releaseSeatIds = new Set(currentItems.map(item => item.seat_id));
    const now = new Date().toISOString();

    if (apiReady) {
      const result = await apiClient.cancelHold(orderId);
      const cancelled = adaptOrder(result.order);
      const apiSeatIds = new Set(result.items.map(item => item.seatId));
      setOrders(prev => prev.map(order => order.id === cancelled.id ? cancelled : order));
      setOrderItems(prev => [
        ...prev.filter(item => item.order_id !== cancelled.id),
        ...result.items.map((item, index) => adaptOrderItem(item, cancelled.id, index)),
      ]);
      setSeats(prev => prev.map(seat => (
        apiSeatIds.has(seat.id) || releaseSeatIds.has(seat.id)
          ? { ...seat, status: 'available' as SeatStatus, locked_by: undefined, lock_expires_at: undefined, updated_at: now }
          : seat
      )));
      setSelectedSeatIds(prev => ({ ...prev, [cancelled.event_id]: new Set<number>() }));
      setHoldExpiry(null);
      setActiveOrderId(null);
      await refreshSeatMap(cancelled.event_id);
      await refreshOrders();
      return true;
    }

    setOrders(prev => prev.map(order => (
      order.id === orderId ? { ...order, status: 'cancelled' as const, updated_at: now } : order
    )));
    setSeats(prev => prev.map(seat => (
      releaseSeatIds.has(seat.id)
        ? { ...seat, status: 'available' as SeatStatus, locked_by: undefined, lock_expires_at: undefined, updated_at: now }
        : seat
    )));
    currentItems.forEach(item => addLog({
      seat_id: item.seat_id,
      user_id: user.id,
      action: 'release',
      reason: 'User cancelled held seats',
    }));
    setSelectedSeatIds(prev => ({ ...prev, [numericEventId]: new Set<number>() }));
    setHoldExpiry(null);
    setActiveOrderId(null);
    return true;
  }, [activeOrderId, addLog, apiReady, orderItems, refreshOrders, refreshSeatMap, user]);

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
    adminOrdersAvailable,
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
    getZoneLayout,
    getStats,
    addEvent,
    deleteEvent: deleteEventFn,
    publishEvent: publishEventFn,
    updateEventData,
    refreshEvents,
    refreshSeatMap,
    refreshOrders,
    refreshAdminOrders,
    selectSeat,
    deselectSeat,
    getUserSeats,
    clearUserSeats,
    holdExpiry,
    setHoldExpiry,
    holdSeats,
    cancelHeldSeats,
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
    adminOrdersAvailable,
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
    getZoneLayout,
    getStats,
    addEvent,
    deleteEventFn,
    publishEventFn,
    updateEventData,
    refreshEvents,
    refreshSeatMap,
    refreshOrders,
    refreshAdminOrders,
    selectSeat,
    deselectSeat,
    getUserSeats,
    clearUserSeats,
    holdExpiry,
    holdSeats,
    cancelHeldSeats,
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
