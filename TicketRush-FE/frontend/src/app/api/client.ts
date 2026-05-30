import type { AudienceStatistics, EventStatus, PaymentMethod, UserGender } from '../data/types';

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
  banner_url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  seatPlan?: string | null;
  seatPlanCode?: string | null;
  seatMapImageUrl?: string | null;
  seatMapUrl?: string | null;
  seat_map_url?: string | null;
  seatingChart?: string | null;
  seating_chart?: string | null;
  seatingChartUrl?: string | null;
  seating_chart_url?: string | null;
  seatingChartImageUrl?: string | null;
  seating_chart_image_url?: string | null;
  queueMode?: 'AUTO' | 'MANUAL' | 'OFF' | string | null;
  queueThreshold?: number | null;
  seat_plan?: string | null;
  seat_plan_code?: string | null;
  seat_map_image_url?: string | null;
  queue_mode?: 'AUTO' | 'MANUAL' | 'OFF' | string | null;
  queue_threshold?: number | null;
  queueEnabled?: boolean | null;
  queue_enabled?: boolean | null;
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

export interface ApiSeatMapResponse {
  event: Pick<ApiEvent, 'id' | 'title' | 'status' | 'location' | 'startTime' | 'seatMapImageUrl' | 'seat_map_image_url' | 'seatMapUrl' | 'seat_map_url' | 'seatingChart' | 'seating_chart' | 'seatingChartUrl' | 'seating_chart_url' | 'seatingChartImageUrl' | 'seating_chart_image_url'>;
  zones: ApiZone[];
  seatMapImageUrl?: string | null;
  seat_map_image_url?: string | null;
  seatMapUrl?: string | null;
  seat_map_url?: string | null;
  seatingChart?: string | null;
  seating_chart?: string | null;
  seatingChartUrl?: string | null;
  seating_chart_url?: string | null;
  seatingChartImageUrl?: string | null;
  seating_chart_image_url?: string | null;
}

export interface ApiOrder {
  id: number;
  orderCode: string;
  userId: number;
  eventId: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  totalAmount: number;
  itemCount?: number;
  item_count?: number;
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
  user?: {
    id: number;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  customer?: {
    id: number;
    fullName: string;
    email: string;
    phone?: string | null;
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

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
const TOKEN_KEY = 'ticketrush.auth.token';
const TOKEN_KEY_DB_NAME = 'ticketrush.auth.secure-store';
const TOKEN_KEY_STORE = 'keys';
const TOKEN_CRYPTO_KEY_ID = 'auth-token';
const ENCRYPTED_TOKEN_VERSION = 1;

interface EncryptedTokenPayload {
  version: typeof ENCRYPTED_TOKEN_VERSION;
  algorithm: 'AES-GCM';
  iv: string;
  ciphertext: string;
}

let memoryToken: string | null | undefined;
let cryptoKeyPromise: Promise<CryptoKey | null> | null = null;

function hasSecureStorageSupport(): boolean {
  return typeof window !== 'undefined' && Boolean(window.crypto?.subtle) && Boolean(window.indexedDB);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function openTokenKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(TOKEN_KEY_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TOKEN_KEY_STORE)) db.createObjectStore(TOKEN_KEY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Secure token store is blocked'));
  });
}

function readTokenCryptoKey(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TOKEN_KEY_STORE, 'readonly');
    const request = transaction.objectStore(TOKEN_KEY_STORE).get(TOKEN_CRYPTO_KEY_ID);

    request.onsuccess = () => resolve(request.result instanceof CryptoKey ? request.result : null);
    request.onerror = () => reject(request.error);
  });
}

function saveTokenCryptoKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TOKEN_KEY_STORE, 'readwrite');
    transaction.objectStore(TOKEN_KEY_STORE).put(key, TOKEN_CRYPTO_KEY_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getTokenCryptoKey(): Promise<CryptoKey | null> {
  if (!hasSecureStorageSupport()) return null;
  if (cryptoKeyPromise) return cryptoKeyPromise;

  cryptoKeyPromise = (async () => {
    let db: IDBDatabase | null = null;
    try {
      db = await openTokenKeyDb();
      const existingKey = await readTokenCryptoKey(db);
      if (existingKey) return existingKey;

      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
      await saveTokenCryptoKey(db, key);
      return key;
    } catch {
      return null;
    } finally {
      db?.close();
    }
  })();

  return cryptoKeyPromise;
}

function parseEncryptedToken(value: string): EncryptedTokenPayload | null {
  try {
    const payload = JSON.parse(value) as Partial<EncryptedTokenPayload>;
    if (
      payload.version === ENCRYPTED_TOKEN_VERSION &&
      payload.algorithm === 'AES-GCM' &&
      typeof payload.iv === 'string' &&
      typeof payload.ciphertext === 'string'
    ) {
      return payload as EncryptedTokenPayload;
    }
  } catch {
    return null;
  }
  return null;
}

async function encryptToken(token: string): Promise<string | null> {
  const key = await getTokenCryptoKey();
  if (!key || typeof window === 'undefined') return null;

  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(token);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: bytesToArrayBuffer(iv) },
      key,
      bytesToArrayBuffer(encoded),
    );
    return JSON.stringify({
      version: ENCRYPTED_TOKEN_VERSION,
      algorithm: 'AES-GCM',
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    } satisfies EncryptedTokenPayload);
  } catch {
    return null;
  }
}

async function decryptToken(payload: EncryptedTokenPayload): Promise<string | null> {
  const key = await getTokenCryptoKey();
  if (!key || typeof window === 'undefined') return null;

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytesToArrayBuffer(base64ToBytes(payload.iv)) },
      key,
      bytesToArrayBuffer(base64ToBytes(payload.ciphertext)),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

function hasStoredToken(): boolean {
  if (memoryToken) return true;
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem(TOKEN_KEY));
}

async function getToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  if (typeof window === 'undefined') return null;

  const storedToken = window.localStorage.getItem(TOKEN_KEY);
  if (!storedToken) {
    memoryToken = null;
    return null;
  }

  const encryptedPayload = parseEncryptedToken(storedToken);
  if (encryptedPayload) {
    memoryToken = await decryptToken(encryptedPayload);
    if (!memoryToken) window.localStorage.removeItem(TOKEN_KEY);
    return memoryToken;
  }

  memoryToken = storedToken;
  await setToken(storedToken);
  return memoryToken;
}

async function setToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (typeof window === 'undefined') return;

  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  const encrypted = await encryptToken(token);
  if (encrypted) {
    window.localStorage.setItem(TOKEN_KEY, encrypted);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
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
  const token = await getToken();

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
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
  hasToken: hasStoredToken,
  getToken,
  setToken,
  async health() {
    return request<{ status: string }>('/health');
  },
  async login(email: string, password: string) {
    const result = await request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(result.token);
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
    await setToken(result.token);
    return result;
  },
  async me() {
    return request<{ user: ApiUser }>('/api/auth/me');
  },
  logout() {
    void setToken(null);
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
    return request<ApiSeatMapResponse>(`/api/events/${eventId}/seat-map`);
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
  async listAdminOrders() {
    return request<{ data: ApiOrder[] }>('/api/admin/orders');
  },
  async getAdminOrder(orderId: number) {
    return request<{ order: ApiOrder; items: ApiOrderItem[] }>(`/api/admin/orders/${orderId}`);
  },
  async confirmPayment(orderId: number, _paymentMethod?: PaymentMethod) {
    return request<{ success: true; order: ApiOrder; items: ApiOrderItem[] }>(`/api/customer/orders/${orderId}/confirm-payment`, {
      method: 'POST',
    });
  },
  async cancelHold(orderId: number) {
    return request<{ success: true; order: ApiOrder; items: ApiOrderItem[] }>(`/api/customer/orders/${orderId}/cancel-hold`, {
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
    seatPlan?: string | null;
    seatPlanCode?: string | null;
    seatMapImageUrl?: string | null;
    bannerFile?: File;
    seatMapFile?: File;
    queueMode?: 'AUTO' | 'MANUAL' | 'OFF';
    queueThreshold?: number;
  }) {
    let body: BodyInit;
    if (payload.bannerFile || payload.seatMapFile) {
      const formData = new FormData();
      formData.append('title', payload.title);
      if (payload.description) formData.append('description', payload.description);
      formData.append('location', payload.location);
      formData.append('startTime', payload.startTime);
      if (payload.endTime) formData.append('endTime', payload.endTime);
      if (payload.saleStartTime) formData.append('saleStartTime', payload.saleStartTime);
      if (payload.saleEndTime) formData.append('saleEndTime', payload.saleEndTime);
      formData.append('status', toApiEventStatus(payload.status));
      if (payload.seatPlan) formData.append('seatPlan', payload.seatPlan);
      if (payload.seatPlanCode) formData.append('seatPlanCode', payload.seatPlanCode);
      if (payload.queueMode) formData.append('queueMode', payload.queueMode);
      if (payload.queueThreshold !== undefined) formData.append('queueThreshold', String(payload.queueThreshold));
      if (payload.bannerUrl && !payload.bannerFile) {
        formData.append('bannerUrl', payload.bannerUrl);
        formData.append('imageUrl', payload.bannerUrl);
      }
      if (payload.bannerFile) formData.append('banner', payload.bannerFile);
      if (payload.seatMapFile) formData.append('seatingChart', payload.seatMapFile);
      body = formData;
    } else {
      body = JSON.stringify({
        ...payload,
        imageUrl: payload.bannerUrl,
        status: toApiEventStatus(payload.status),
      });
    }

    return request<{ event: ApiEvent }>('/api/admin/events', {
      method: 'POST',
      body,
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
    seatPlan?: string | null;
    seatPlanCode?: string | null;
    seatMapImageUrl?: string | null;
    bannerFile?: File;
    seatMapFile?: File;
    queueMode?: 'AUTO' | 'MANUAL' | 'OFF';
    queueThreshold?: number;
  }) {
    let body: BodyInit;
    if (payload.bannerFile || payload.seatMapFile) {
      const formData = new FormData();
      if (payload.title) formData.append('title', payload.title);
      if (payload.description) formData.append('description', payload.description);
      if (payload.location) formData.append('location', payload.location);
      if (payload.startTime) formData.append('startTime', payload.startTime);
      if (payload.endTime) formData.append('endTime', payload.endTime);
      if (payload.saleStartTime) formData.append('saleStartTime', payload.saleStartTime);
      if (payload.saleEndTime) formData.append('saleEndTime', payload.saleEndTime);
      if (payload.status) formData.append('status', toApiEventStatus(payload.status));
      if (payload.seatPlan) formData.append('seatPlan', payload.seatPlan);
      if (payload.seatPlanCode) formData.append('seatPlanCode', payload.seatPlanCode);
      if (payload.queueMode) formData.append('queueMode', payload.queueMode);
      if (payload.queueThreshold !== undefined) formData.append('queueThreshold', String(payload.queueThreshold));
      if (payload.bannerUrl && !payload.bannerFile) {
        formData.append('bannerUrl', payload.bannerUrl);
        formData.append('imageUrl', payload.bannerUrl);
      }
      if (payload.bannerFile) formData.append('banner', payload.bannerFile);
      if (payload.seatMapFile) formData.append('seatingChart', payload.seatMapFile);
      body = formData;
    } else {
      body = JSON.stringify({
        ...payload,
        imageUrl: payload.bannerUrl,
        status: payload.status ? toApiEventStatus(payload.status) : undefined,
      });
    }

    return request<{ event: ApiEvent }>(`/api/admin/events/${eventId}`, {
      method: 'PUT',
      body,
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
    return request<AudienceStatistics>(`/api/admin/events/${eventId}/audience-statistics`);
  },
};

export function isNetworkError(error: unknown) {
  return error instanceof ApiError && error.status === 0;
}
