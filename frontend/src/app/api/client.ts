import type { EventStatus, PaymentMethod, UserGender } from '../data/types';

export interface ApiUser {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  createdAt?: string;
}

export interface ApiEvent {
  id: number;
  title: string;
  description?: string | null;
  location: string;
  startTime: string;
  endTime?: string | null;
  saleStartTime?: string | null;
  saleEndTime?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';
  bannerUrl?: string | null;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  stats?: ApiStats;
}

export interface ApiStats {
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  soldSeats: number;
  occupancyRate: number;
}

export interface ApiZone {
  id: number;
  eventId?: number;
  name: string;
  rowCount: number;
  seatsPerRow: number;
  price: number;
  color?: string | null;
  createdAt?: string;
  rows?: Array<{
    rowLabel: string;
    seats: Array<{
      id: number;
      seatCode: string;
      seatNumber: number;
      status: 'AVAILABLE' | 'LOCKED' | 'SOLD';
      lockedUntil?: string | null;
    }>;
  }>;
}

export interface ApiOrder {
  id: number;
  orderCode: string;
  userId: number;
  eventId: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  totalAmount: number;
  expiresAt: string;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  event?: {
    id: number;
    title: string;
    location: string;
    startTime: string;
  };
}

export interface ApiOrderItem {
  id?: number;
  seatId: number;
  seatCode?: string;
  rowLabel?: string;
  seatNumber?: number;
  zoneName?: string;
  price: number;
  createdAt?: string;
}

export interface ApiQueueEntry {
  id?: number;
  eventId?: number;
  userId?: number;
  queueToken?: string;
  status: 'NOT_JOINED' | 'WAITING' | 'ACTIVE' | 'DONE' | 'EXPIRED';
  positionNumber?: number;
  position?: number | null;
  peopleAhead?: number | null;
  canEnter?: boolean;
  activatedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
const TOKEN_KEY = 'ticketrush.auth.token';

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

function toApiGender(gender?: UserGender) {
  if (gender === 'male') return 'MALE';
  if (gender === 'female') return 'FEMALE';
  if (gender === 'other') return 'OTHER';
  return undefined;
}

function toApiEventStatus(status: EventStatus) {
  if (status === 'draft') return 'DRAFT';
  if (status === 'ended') return 'FINISHED';
  if (status === 'cancelled') return 'CANCELLED';
  return 'PUBLISHED';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Không kết nối được backend', 0);
  }

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text || response.statusText };
  }

  if (!response.ok) {
    throw new ApiError(payload?.message || 'API request failed', response.status, payload?.details);
  }

  return payload as T;
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  get token() {
    return getToken();
  },
  setToken,
  async health() {
    return request<{ status: string }>('/health');
  },
  async login(email: string, password: string) {
    const result = await request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.token);
    return result;
  },
  async register(data: {
    fullName: string;
    email: string;
    password: string;
    gender?: UserGender;
    dateOfBirth?: string;
    phone?: string;
  }) {
    const result = await request<{ token: string; user: ApiUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        gender: toApiGender(data.gender),
        dateOfBirth: data.dateOfBirth || null,
        phone: data.phone || null,
      }),
    });
    setToken(result.token);
    return result;
  },
  async me() {
    return request<{ user: ApiUser }>('/api/auth/me');
  },
  logout() {
    setToken(null);
  },
  async listEvents(status = 'PUBLISHED') {
    const search = new URLSearchParams();
    search.set('status', status);
    search.set('limit', '100');
    return request<{ data: ApiEvent[]; pagination: { page: number; limit: number } }>(`/api/events?${search.toString()}`);
  },
  async listAllEvents() {
    const statuses = ['PUBLISHED', 'DRAFT', 'CANCELLED', 'FINISHED'];
    const responses = await Promise.all(statuses.map(status => this.listEvents(status)));
    const events = responses.flatMap(response => response.data);
    return Array.from(new Map(events.map(event => [event.id, event])).values());
  },
  async getEvent(eventId: number) {
    return request<{ event: ApiEvent; zones: ApiZone[]; stats: ApiStats }>(`/api/events/${eventId}`);
  },
  async getSeatMap(eventId: number) {
    return request<{ event: Pick<ApiEvent, 'id' | 'title' | 'status' | 'location' | 'startTime'>; zones: ApiZone[] }>(`/api/events/${eventId}/seat-map`);
  },
  async joinQueue(eventId: number) {
    return request<ApiQueueEntry>(`/api/events/${eventId}/queue/join`, { method: 'POST' });
  },
  async getQueueStatus(eventId: number) {
    return request<ApiQueueEntry>(`/api/events/${eventId}/queue/status`);
  },
  async leaveQueue(eventId: number) {
    return request<{ success: boolean }>(`/api/events/${eventId}/queue/leave`, { method: 'POST' });
  },
  async lockSeats(eventId: number, seatIds: number[]) {
    return request<{ order: ApiOrder; items: ApiOrderItem[] }>(`/api/customer/events/${eventId}/lock-seats`, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    });
  },
  async listOrders() {
    return request<{ data: ApiOrder[] }>('/api/customer/orders');
  },
  async getOrder(orderId: number) {
    return request<{ order: ApiOrder; items: ApiOrderItem[] }>(`/api/customer/orders/${orderId}`);
  },
  async confirmPayment(orderId: number, _paymentMethod?: PaymentMethod) {
    return request<{ success: true; order: ApiOrder; items: ApiOrderItem[] }>(`/api/customer/orders/${orderId}/confirm-payment`, {
      method: 'POST',
    });
  },
  async createEvent(payload: {
    title: string;
    description?: string;
    location: string;
    startTime: string;
    endTime?: string | null;
    saleStartTime?: string | null;
    saleEndTime?: string | null;
    status: EventStatus;
    bannerUrl?: string | null;
  }) {
    return request<{ event: ApiEvent }>('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        status: toApiEventStatus(payload.status),
      }),
    });
  },
  async createZone(eventId: number, payload: {
    name: string;
    rowCount: number;
    seatsPerRow: number;
    price: number;
    color?: string | null;
  }) {
    return request<{ zone: ApiZone }>(`/api/admin/events/${eventId}/zones`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async generateSeats(eventId: number) {
    return request<{ generatedSeats: number }>(`/api/admin/events/${eventId}/generate-seats`, { method: 'POST' });
  },
  async getDashboard(eventId: number) {
    return request<ApiStats & { revenue: number }>(`/api/admin/events/${eventId}/dashboard`);
  },
  async updateEvent(eventId: number, payload: {
    title?: string;
    description?: string;
    location?: string;
    startTime?: string;
    endTime?: string | null;
    saleStartTime?: string | null;
    saleEndTime?: string | null;
    status?: EventStatus;
    bannerUrl?: string | null;
  }) {
    return request<{ event: ApiEvent }>(`/api/admin/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        status: payload.status ? toApiEventStatus(payload.status) : undefined,
      }),
    });
  },
  async deleteEvent(eventId: number) {
    return request<{ success: boolean }>(`/api/admin/events/${eventId}`, {
      method: 'DELETE',
    });
  },
  async publishEvent(eventId: number) {
    return request<{ event: ApiEvent }>(`/api/admin/events/${eventId}/publish`, {
      method: 'POST',
    });
  },
  async getAudienceStatistics(eventId: number) {
    return request<{ totalUsers: number; newUsers: number; returningUsers: number }>(`/api/admin/events/${eventId}/audience-statistics`);
  },
};

export function isNetworkError(error: unknown) {
  return error instanceof ApiError && error.status === 0;
}
