import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, Copy, FlipHorizontal2, Maximize2, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../store/AppContext';
import { AUTO_QUEUE_MARKER } from '../../data/types';
import type { Event, SeatZone, ZoneLayout } from '../../data/types';
import { getAutoEventStatus } from '../../data/mockData';
import { usePreferences } from '../../store/PreferencesContext';

interface ZoneForm {
  key: string;
  zoneId?: number;
  name: string;
  price: number;
  rows: number;
  cols: number;
  color: string;
  layout_x: number;
  layout_y: number;
  layout_width: number;
  layout_height: number;
  layout_rotation: number;
  createdAt?: string;
}

type ZoneFormField = keyof Pick<ZoneForm, 'name' | 'price' | 'rows' | 'cols' | 'color' | 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation'>;

interface ZonePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ZoneDragState {
  key: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

type ZoneResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface ZoneResizeState {
  key: string;
  pointerId: number;
  handle: ZoneResizeHandle;
  startPointerX: number;
  startPointerY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
}

interface ZoneRotateState {
  key: string;
  pointerId: number;
  centerX: number;
  centerY: number;
  startAngle: number;
  startRotation: number;
}

interface LayoutGuides {
  vertical: number[];
  horizontal: number[];
}

interface SnapTarget {
  value: number;
  guide: number;
}

type InteractionMode = 'move' | 'resize' | 'rotate';

interface ZoneBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface MeasurementLine {
  start: number;
  end: number;
  cross: number;
  value: number;
}

interface InteractionOverlay extends ZoneBox {
  key: string;
  mode: InteractionMode;
  gapX?: number;
  gapY?: number;
  measureX?: MeasurementLine;
  measureY?: MeasurementLine;
}

interface EventFormState {
  title: string;
  description: string;
  location: string;
  event_time: string;
  seat_plan: string;
  sale_start_time: string;
  sale_end_time: string;
  banner_url: string;
  seat_map_image_url: string;
}

const COLORS = ['#F97316', '#0EA5E9', '#16A34A', '#7C3AED', '#F43F5E', '#64748B'];
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1280&q=80';
const SEAT_PLAN_LAYOUT_PREFIX = 'layout:';
const CENTER_SNAP_PX = 8;
const MIN_LAYOUT_SIZE = 10;
const BLOCK_GAP_PERCENT = 3;
const GRID_SNAP_PERCENT = 2;
const ROTATION_SNAP_DEGREES = 5;
const ANGLE_PRESETS = [-30, -20, -15, 0, 15, 20, 30];
const RESIZE_HANDLES: Array<{ handle: ZoneResizeHandle; className: string; title: string }> = [
  { handle: 'n', className: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize', title: 'Resize top' },
  { handle: 'ne', className: '-top-1.5 -right-1.5 cursor-nesw-resize', title: 'Resize top right' },
  { handle: 'e', className: 'right-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize', title: 'Resize right' },
  { handle: 'se', className: '-bottom-1.5 -right-1.5 cursor-nwse-resize', title: 'Resize bottom right' },
  { handle: 's', className: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize', title: 'Resize bottom' },
  { handle: 'sw', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize', title: 'Resize bottom left' },
  { handle: 'w', className: 'left-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize', title: 'Resize left' },
  { handle: 'nw', className: '-top-1.5 -left-1.5 cursor-nwse-resize', title: 'Resize top left' },
];

function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalInputValue(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return toLocalInput(date);
}

function parseInputDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function seatPlanWithoutQueue(seatPlan: string): string {
  return seatPlan
    .split('|')
    .map(part => part.trim())
    .filter(part => {
      const normalized = part.toLowerCase();
      return part && normalized !== 'queue' && !normalized.startsWith('queue:') && !normalized.startsWith(SEAT_PLAN_LAYOUT_PREFIX);
    })
    .join('|');
}

function encodeSeatPlanLayout(zones: Array<Pick<ZoneForm, 'name' | 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation'>>): string {
  const layout = zones
    .filter(zone => zone.name.trim())
    .map(zone => ({
      name: zone.name.trim(),
      x: zone.layout_x,
      y: zone.layout_y,
      width: zone.layout_width,
      height: zone.layout_height,
      rotation: zone.layout_rotation,
    }));

  return `${SEAT_PLAN_LAYOUT_PREFIX}${encodeURIComponent(JSON.stringify(layout))}`;
}

function normalizeSeatPlan(seatPlan: string, zones: Array<Pick<ZoneForm, 'name' | 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation'>>): string {
  const base = seatPlanWithoutQueue(seatPlan) || 'seat-map';
  return `${base}|${AUTO_QUEUE_MARKER}|${encodeSeatPlanLayout(zones)}`;
}

function clampPercent(value: unknown, fallback: number, min: number, max: number): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeRotation(value: number): number {
  const normalized = value % 360;
  return Math.round((normalized < 0 ? normalized + 360 : normalized) * 10) / 10;
}

function signedRotation(value: number): number {
  const normalized = normalizeRotation(value);
  return normalized > 180 ? roundPercent(normalized - 360) : roundPercent(normalized);
}

function snapPercentToGrid(value: number): number {
  return roundPercent(Math.round(value / GRID_SNAP_PERCENT) * GRID_SNAP_PERCENT);
}

function snapRotationToStep(value: number): number {
  return normalizeRotation(Math.round(value / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES);
}

function pointerAngle(centerX: number, centerY: number, clientX: number, clientY: number): number {
  return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
}

function addGuide(guides: number[], value: number) {
  const next = roundPercent(value);
  if (next < 0 || next > 100 || guides.some(guide => Math.abs(guide - next) < 0.2)) return;
  guides.push(next);
}

function nearestSnap(value: number, targets: SnapTarget[], threshold: number, min: number, max: number): SnapTarget | null {
  let nearest: SnapTarget | null = null;
  let nearestDistance = threshold;

  for (const target of targets) {
    if (target.value < min || target.value > max) continue;
    const distance = Math.abs(value - target.value);
    if (distance <= nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function defaultZonePlacement(index: number, total: number): ZonePlacement {
  const presets: Record<number, ZonePlacement[]> = {
    1: [{ x: 20, y: 30, width: 60, height: 46 }],
    2: [
      { x: 8, y: 36, width: 38, height: 42 },
      { x: 54, y: 36, width: 38, height: 42 },
    ],
    3: [
      { x: 34, y: 20, width: 32, height: 28 },
      { x: 8, y: 52, width: 36, height: 32 },
      { x: 56, y: 52, width: 36, height: 32 },
    ],
    4: [
      { x: 34, y: 18, width: 32, height: 22 },
      { x: 8, y: 44, width: 32, height: 28 },
      { x: 60, y: 44, width: 32, height: 28 },
      { x: 20, y: 76, width: 60, height: 18 },
    ],
  };

  const preset = presets[total]?.[index];
  if (preset) return preset;

  const columns = Math.min(3, Math.ceil(Math.sqrt(total)));
  const rows = Math.ceil(total / columns);
  const col = index % columns;
  const row = Math.floor(index / columns);
  const width = 84 / columns;
  const height = Math.min(24, 62 / rows);

  return {
    x: 8 + col * width,
    y: 24 + row * (height + 6),
    width: width - 4,
    height,
  };
}

function createZoneForm(
  zone: Omit<ZoneForm, 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation'>,
  index: number,
  total: number,
  layout?: ZoneLayout,
): ZoneForm {
  const fallback = defaultZonePlacement(index, total);
  return {
    ...zone,
    layout_x: clampPercent(layout?.x, fallback.x, 0, 92),
    layout_y: clampPercent(layout?.y, fallback.y, 12, 94),
    layout_width: clampPercent(layout?.width, fallback.width, MIN_LAYOUT_SIZE, 96),
    layout_height: clampPercent(layout?.height, fallback.height, MIN_LAYOUT_SIZE, 80),
    layout_rotation: normalizeRotation(layout?.rotation ?? 0),
  };
}

function validateForm(form: EventFormState, language: 'vi' | 'en'): string | null {
  if (!form.title.trim() || !form.location.trim() || !form.event_time || !form.sale_start_time || !form.sale_end_time) {
    return language === 'en'
      ? 'Please fill event name, location, event time and sale time'
      : 'Vui lòng nhập đủ tên sự kiện, địa điểm, thời gian diễn ra và thời gian bán vé';
  }

  const eventTime = parseInputDate(form.event_time);
  const saleStart = parseInputDate(form.sale_start_time);
  const saleEnd = parseInputDate(form.sale_end_time);

  if (!eventTime || !saleStart || !saleEnd) {
    return language === 'en' ? 'Invalid time value' : 'Thời gian không hợp lệ';
  }

  if (eventTime.getTime() <= Date.now()) {
    return language === 'en' ? 'Event time must be in the future' : 'Thời gian diễn ra phải sau thời điểm hiện tại';
  }

  if (saleStart.getTime() >= saleEnd.getTime()) {
    return language === 'en'
      ? 'Sale start time must be before sale end time'
      : 'Thời gian mở bán phải trước thời gian kết thúc bán vé';
  }

  if (saleEnd.getTime() >= eventTime.getTime()) {
    return language === 'en'
      ? 'Sale end time must be before event time'
      : 'Thời gian kết thúc bán vé phải trước thời gian diễn ra sự kiện';
  }

  if (saleEnd.getTime() <= Date.now()) {
    return language === 'en'
      ? 'Sale end time must be in the future'
      : 'Thời gian kết thúc bán vé phải sau thời điểm hiện tại';
  }

  return null;
}

function emptyForm(now: string): EventFormState {
  return {
    title: '',
    description: '',
    location: '',
    event_time: '',
    seat_plan: 'stadium-360',
    sale_start_time: now,
    sale_end_time: '',
    banner_url: '',
    seat_map_image_url: '',
  };
}

export default function AdminCreateEventPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const routeEventId = id ? Number(id) : null;
  const isEdit = Boolean(routeEventId);
  const { addEvent, updateEventData, getEvent, getZones, getZoneLayout, user } = useApp();
  const { language } = usePreferences();
  const initialNow = useMemo(() => toLocalInput(new Date()), []);
  const editingEvent = routeEventId ? getEvent(routeEventId) : undefined;
  const [loadedEventId, setLoadedEventId] = useState<number | null>(null);
  const [form, setForm] = useState<EventFormState>(() => emptyForm(initialNow));
  const [zones, setZones] = useState<ZoneForm[]>(() => [
    createZoneForm({ key: '1', name: 'VIP', price: 2200000, rows: 3, cols: 10, color: '#F97316' }, 0, 3),
    createZoneForm({ key: '2', name: 'A', price: 1200000, rows: 5, cols: 12, color: '#0EA5E9' }, 1, 3),
    createZoneForm({ key: '3', name: 'B', price: 750000, rows: 5, cols: 12, color: '#7C3AED' }, 2, 3),
  ]);
  const [saving, setSaving] = useState(false);
  const layoutPreviewRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<ZoneDragState | null>(null);
  const [resizeState, setResizeState] = useState<ZoneResizeState | null>(null);
  const [rotateState, setRotateState] = useState<ZoneRotateState | null>(null);
  const [layoutGuides, setLayoutGuides] = useState<LayoutGuides>({ vertical: [], horizontal: [] });
  const [interaction, setInteraction] = useState<InteractionOverlay | null>(null);
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>('1');
  const [referenceZoneKey, setReferenceZoneKey] = useState<string | null>('2');

  useEffect(() => {
    if (!routeEventId || !editingEvent || loadedEventId === routeEventId) return;

    const eventZones = getZones(routeEventId);
    setForm({
      title: editingEvent.title,
      description: editingEvent.description,
      location: editingEvent.location,
      event_time: toLocalInputValue(editingEvent.event_time),
      seat_plan: seatPlanWithoutQueue(editingEvent.seat_plan) || 'seat-map',
      sale_start_time: toLocalInputValue(editingEvent.sale_start_time),
      sale_end_time: toLocalInputValue(editingEvent.sale_end_time),
      banner_url: editingEvent.banner_url,
      seat_map_image_url: editingEvent.seat_map_image_url ?? '',
    });
    setZones(eventZones.map((zone, index) => {
      const layout = getZoneLayout(zone.id);
      return createZoneForm({
        key: String(zone.id),
        zoneId: zone.id,
        name: zone.name,
        price: zone.price,
        rows: layout?.rows ?? 1,
        cols: layout?.cols ?? zone.total_capacity,
        color: zone.color ?? layout?.color ?? COLORS[index % COLORS.length],
        createdAt: zone.created_at,
      }, index, eventZones.length, layout);
    }));
    setLoadedEventId(routeEventId);
  }, [editingEvent, getZoneLayout, getZones, loadedEventId, routeEventId]);

  useEffect(() => {
    const nextSelectedKey = zones.some(zone => zone.key === selectedZoneKey) ? selectedZoneKey : zones[0]?.key ?? null;
    if (nextSelectedKey !== selectedZoneKey) setSelectedZoneKey(nextSelectedKey);

    const nextReferenceKey = referenceZoneKey && zones.some(zone => zone.key === referenceZoneKey && zone.key !== nextSelectedKey)
      ? referenceZoneKey
      : zones.find(zone => zone.key !== nextSelectedKey)?.key ?? null;
    if (nextReferenceKey !== referenceZoneKey) setReferenceZoneKey(nextReferenceKey);
  }, [referenceZoneKey, selectedZoneKey, zones]);

  const updateForm = (key: keyof EventFormState, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));
  const updateZone = (key: string, field: ZoneFormField, value: string | number) => {
    setZones(prev => prev.map(zone => zone.key === key ? { ...zone, [field]: value } : zone));
  };

  const handleImageFile = (field: 'banner_url' | 'seat_map_image_url') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'en' ? 'Please choose an image file' : 'Vui lòng chọn file ảnh');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateForm(field, reader.result);
    };
    reader.onerror = () => toast.error(language === 'en' ? 'Could not read image file' : 'Không thể đọc file ảnh');
    reader.readAsDataURL(file);
  };

  const addZone = () => {
    const key = `new-${Date.now()}`;
    setZones(prev => [
      ...prev,
      createZoneForm({
        key,
        name: `Khu ${prev.length + 1}`,
        price: 500000,
        rows: 4,
        cols: 10,
        color: COLORS[prev.length % COLORS.length],
      }, prev.length, prev.length + 1),
    ]);
    setSelectedZoneKey(key);
  };

  const removeZone = (key: string) => {
    if (zones.length === 1) {
      toast.error(language === 'en' ? 'At least one zone is required' : 'Cần ít nhất một khu ghế');
      return;
    }
    setZones(prev => prev.filter(zone => zone.key !== key));
  };

  const getZoneBox = (zone: ZoneForm, index: number): ZoneBox => {
    const fallback = defaultZonePlacement(index, zones.length);
    const x = clampPercent(zone.layout_x, fallback.x, 0, 92);
    const y = clampPercent(zone.layout_y, fallback.y, 12, 94);
    return {
      x,
      y,
      width: clampPercent(zone.layout_width, fallback.width, MIN_LAYOUT_SIZE, Math.max(MIN_LAYOUT_SIZE, 100 - x)),
      height: clampPercent(zone.layout_height, fallback.height, MIN_LAYOUT_SIZE, Math.max(MIN_LAYOUT_SIZE, 100 - y)),
      rotation: normalizeRotation(zone.layout_rotation),
    };
  };

  const measureNearestGaps = (key: string, box: ZoneBox): Pick<InteractionOverlay, 'gapX' | 'gapY' | 'measureX' | 'measureY'> => {
    let gapX = Number.POSITIVE_INFINITY;
    let gapY = Number.POSITIVE_INFINITY;
    let measureX: MeasurementLine | undefined;
    let measureY: MeasurementLine | undefined;

    zones.forEach((otherZone, index) => {
      if (otherZone.key === key) return;
      const other = getZoneBox(otherZone, index);
      const overlapsVertically = box.y < other.y + other.height && other.y < box.y + box.height;
      const overlapsHorizontally = box.x < other.x + other.width && other.x < box.x + box.width;

      if (overlapsVertically) {
        const cross = roundPercent((Math.max(box.y, other.y) + Math.min(box.y + box.height, other.y + other.height)) / 2);
        if (box.x >= other.x + other.width) {
          const value = box.x - (other.x + other.width);
          if (value < gapX) {
            gapX = value;
            measureX = { start: other.x + other.width, end: box.x, cross, value: roundPercent(value) };
          }
        }
        if (other.x >= box.x + box.width) {
          const value = other.x - (box.x + box.width);
          if (value < gapX) {
            gapX = value;
            measureX = { start: box.x + box.width, end: other.x, cross, value: roundPercent(value) };
          }
        }
      }

      if (overlapsHorizontally) {
        const cross = roundPercent((Math.max(box.x, other.x) + Math.min(box.x + box.width, other.x + other.width)) / 2);
        if (box.y >= other.y + other.height) {
          const value = box.y - (other.y + other.height);
          if (value < gapY) {
            gapY = value;
            measureY = { start: other.y + other.height, end: box.y, cross, value: roundPercent(value) };
          }
        }
        if (other.y >= box.y + box.height) {
          const value = other.y - (box.y + box.height);
          if (value < gapY) {
            gapY = value;
            measureY = { start: box.y + box.height, end: other.y, cross, value: roundPercent(value) };
          }
        }
      }
    });

    return {
      gapX: Number.isFinite(gapX) ? roundPercent(gapX) : undefined,
      gapY: Number.isFinite(gapY) ? roundPercent(gapY) : undefined,
      measureX,
      measureY,
    };
  };

  const showInteraction = (zone: ZoneForm, mode: InteractionMode, box: ZoneBox) => {
    setInteraction({
      key: zone.key,
      mode,
      ...box,
      ...measureNearestGaps(zone.key, box),
    });
  };


  const updateZoneLayout = (key: string, patch: Partial<Pick<ZoneForm, 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation'>>) => {
    setZones(prev => prev.map((zone, index) => {
      if (zone.key !== key) return zone;
      const fallback = defaultZonePlacement(index, prev.length);
      let layout_x = Number(patch.layout_x ?? zone.layout_x);
      let layout_y = Number(patch.layout_y ?? zone.layout_y);
      let layout_width = Number(patch.layout_width ?? zone.layout_width);
      let layout_height = Number(patch.layout_height ?? zone.layout_height);

      layout_x = roundPercent(clampPercent(layout_x, fallback.x, 0, 100 - MIN_LAYOUT_SIZE));
      layout_y = roundPercent(clampPercent(layout_y, fallback.y, 12, 100 - MIN_LAYOUT_SIZE));
      layout_width = roundPercent(clampPercent(layout_width, fallback.width, MIN_LAYOUT_SIZE, 100 - layout_x));
      layout_height = roundPercent(clampPercent(layout_height, fallback.height, MIN_LAYOUT_SIZE, 100 - layout_y));

      return {
        ...zone,
        layout_x,
        layout_y,
        layout_width,
        layout_height,
        layout_rotation: normalizeRotation(Number(patch.layout_rotation ?? zone.layout_rotation)),
      };
    }));
  };

  const selectZone = (key: string) => {
    setSelectedZoneKey(key);
    if (referenceZoneKey === key) setReferenceZoneKey(zones.find(zone => zone.key !== key)?.key ?? null);
    layoutPreviewRef.current?.focus();
  };

  const startZoneDrag = (event: ReactPointerEvent<HTMLDivElement>, zone: ZoneForm) => {
    const preview = layoutPreviewRef.current;
    if (!preview) return;

    event.preventDefault();
    selectZone(zone.key);
    const rect = preview.getBoundingClientRect();
    const box = getZoneBox(zone, zones.findIndex(item => item.key === zone.key));
    const left = (box.x / 100) * rect.width;
    const top = (box.y / 100) * rect.height;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      key: zone.key,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left - left,
      offsetY: event.clientY - rect.top - top,
    });
    setLayoutGuides({ vertical: [], horizontal: [] });
    showInteraction(zone, 'move', getZoneBox(zone, zones.findIndex(item => item.key === zone.key)));
  };

  const moveZoneDrag = (event: ReactPointerEvent<HTMLDivElement>, zone: ZoneForm) => {
    const preview = layoutPreviewRef.current;
    if (!preview || dragState?.key !== zone.key) return;

    event.preventDefault();
    const rect = preview.getBoundingClientRect();
    const currentBox = getZoneBox(zone, zones.findIndex(item => item.key === zone.key));
    const zoneWidth = currentBox.width;
    const zoneHeight = currentBox.height;
    const maxX = Math.max(0, 100 - zoneWidth);
    const maxY = Math.max(12, 100 - zoneHeight);
    const snapX = (CENTER_SNAP_PX / rect.width) * 100;
    const snapY = (CENTER_SNAP_PX / rect.height) * 100;
    const verticalTargets: SnapTarget[] = [{ value: 50 - zoneWidth / 2, guide: 50 }];
    const horizontalTargets: SnapTarget[] = [{ value: 50 - zoneHeight / 2, guide: 50 }];

    zones.forEach((otherZone, otherIndex) => {
      if (otherZone.key === zone.key) return;

      const otherBox = getZoneBox(otherZone, otherIndex);
      const otherX = otherBox.x;
      const otherY = otherBox.y;
      const otherWidth = otherBox.width;
      const otherHeight = otherBox.height;
      const otherCenterX = otherX + otherWidth / 2;
      const otherCenterY = otherY + otherHeight / 2;
      const otherRight = otherX + otherWidth;
      const otherBottom = otherY + otherHeight;

      verticalTargets.push(
        { value: otherX, guide: otherX },
        { value: otherCenterX - zoneWidth / 2, guide: otherCenterX },
        { value: otherRight - zoneWidth, guide: otherRight },
        { value: otherX - zoneWidth - BLOCK_GAP_PERCENT, guide: otherX - BLOCK_GAP_PERCENT / 2 },
        { value: otherRight + BLOCK_GAP_PERCENT, guide: otherRight + BLOCK_GAP_PERCENT / 2 },
      );
      horizontalTargets.push(
        { value: otherY, guide: otherY },
        { value: otherCenterY - zoneHeight / 2, guide: otherCenterY },
        { value: otherBottom - zoneHeight, guide: otherBottom },
        { value: otherY - zoneHeight - BLOCK_GAP_PERCENT, guide: otherY - BLOCK_GAP_PERCENT / 2 },
        { value: otherBottom + BLOCK_GAP_PERCENT, guide: otherBottom + BLOCK_GAP_PERCENT / 2 },
      );
    });

    let nextX = ((event.clientX - rect.left - dragState.offsetX) / rect.width) * 100;
    let nextY = ((event.clientY - rect.top - dragState.offsetY) / rect.height) * 100;
    const nextGuides: LayoutGuides = { vertical: [], horizontal: [] };
    const snappedX = nearestSnap(nextX, verticalTargets, snapX, 0, maxX);
    const snappedY = nearestSnap(nextY, horizontalTargets, snapY, 12, maxY);

    if (snappedX) {
      nextX = snappedX.value;
      addGuide(nextGuides.vertical, snappedX.guide);
    } else {
      nextX = snapPercentToGrid(nextX);
    }
    if (snappedY) {
      nextY = snappedY.value;
      addGuide(nextGuides.horizontal, snappedY.guide);
    } else {
      nextY = snapPercentToGrid(nextY);
    }

    const layout_x = roundPercent(clampPercent(nextX, zone.layout_x, 0, maxX));
    const layout_y = roundPercent(clampPercent(nextY, zone.layout_y, 12, maxY));

    updateZoneLayout(zone.key, { layout_x, layout_y });
    setLayoutGuides(nextGuides);
    showInteraction(zone, 'move', {
      x: layout_x,
      y: layout_y,
      width: zoneWidth,
      height: zoneHeight,
      rotation: normalizeRotation(zone.layout_rotation),
    });
  };

  const stopZoneDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState && event.currentTarget.hasPointerCapture(dragState.pointerId)) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);
    }
    setDragState(null);
    setLayoutGuides({ vertical: [], horizontal: [] });
    setInteraction(null);
  };

  const startZoneResize = (event: ReactPointerEvent<HTMLDivElement>, zone: ZoneForm, handle: ZoneResizeHandle) => {
    event.preventDefault();
    event.stopPropagation();
    selectZone(zone.key);

    const box = getZoneBox(zone, zones.findIndex(item => item.key === zone.key));
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizeState({
      key: zone.key,
      pointerId: event.pointerId,
      handle,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startLeft: box.x,
      startTop: box.y,
      startWidth: box.width,
      startHeight: box.height,
    });
    showInteraction(zone, 'resize', box);
  };

  const moveZoneResize = (event: ReactPointerEvent<HTMLDivElement>, zone: ZoneForm) => {
    const preview = layoutPreviewRef.current;
    if (!preview || resizeState?.key !== zone.key) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = preview.getBoundingClientRect();
    const deltaX = ((event.clientX - resizeState.startPointerX) / rect.width) * 100;
    const deltaY = ((event.clientY - resizeState.startPointerY) / rect.height) * 100;
    const right = resizeState.startLeft + resizeState.startWidth;
    const bottom = resizeState.startTop + resizeState.startHeight;
    let layout_x = resizeState.startLeft;
    let layout_y = resizeState.startTop;
    let layout_width = resizeState.startWidth;
    let layout_height = resizeState.startHeight;

    if (resizeState.handle.includes('e')) {
      layout_width = roundPercent(clampPercent(snapPercentToGrid(resizeState.startWidth + deltaX), resizeState.startWidth, MIN_LAYOUT_SIZE, 100 - layout_x));
    }
    if (resizeState.handle.includes('s')) {
      layout_height = roundPercent(clampPercent(snapPercentToGrid(resizeState.startHeight + deltaY), resizeState.startHeight, MIN_LAYOUT_SIZE, 100 - layout_y));
    }
    if (resizeState.handle.includes('w')) {
      layout_x = roundPercent(clampPercent(snapPercentToGrid(resizeState.startLeft + deltaX), resizeState.startLeft, 0, right - MIN_LAYOUT_SIZE));
      layout_width = roundPercent(right - layout_x);
    }
    if (resizeState.handle.includes('n')) {
      layout_y = roundPercent(clampPercent(snapPercentToGrid(resizeState.startTop + deltaY), resizeState.startTop, 12, bottom - MIN_LAYOUT_SIZE));
      layout_height = roundPercent(bottom - layout_y);
    }

    updateZoneLayout(zone.key, { layout_x, layout_y, layout_width, layout_height });
    showInteraction(zone, 'resize', {
      x: layout_x,
      y: layout_y,
      width: layout_width,
      height: layout_height,
      rotation: normalizeRotation(zone.layout_rotation),
    });
  };

  const stopZoneResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeState && event.currentTarget.hasPointerCapture(resizeState.pointerId)) {
      event.currentTarget.releasePointerCapture(resizeState.pointerId);
    }
    setResizeState(null);
    setInteraction(null);
  };

  const startZoneRotate = (event: ReactPointerEvent<HTMLDivElement>, zone: ZoneForm) => {
    event.preventDefault();
    event.stopPropagation();
    selectZone(zone.key);

    const target = event.currentTarget.parentElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    event.currentTarget.setPointerCapture(event.pointerId);
    setRotateState({
      key: zone.key,
      pointerId: event.pointerId,
      centerX,
      centerY,
      startAngle: pointerAngle(centerX, centerY, event.clientX, event.clientY),
      startRotation: zone.layout_rotation,
    });
    showInteraction(zone, 'rotate', getZoneBox(zone, zones.findIndex(item => item.key === zone.key)));
  };

  const moveZoneRotate = (event: ReactPointerEvent<HTMLDivElement>, zone: ZoneForm) => {
    if (rotateState?.key !== zone.key) return;

    event.preventDefault();
    event.stopPropagation();
    const currentAngle = pointerAngle(rotateState.centerX, rotateState.centerY, event.clientX, event.clientY);
    const layout_rotation = snapRotationToStep(rotateState.startRotation + currentAngle - rotateState.startAngle);

    updateZoneLayout(zone.key, { layout_rotation });
    showInteraction(zone, 'rotate', {
      ...getZoneBox(zone, zones.findIndex(item => item.key === zone.key)),
      rotation: layout_rotation,
    });
  };

  const stopZoneRotate = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (rotateState && event.currentTarget.hasPointerCapture(rotateState.pointerId)) {
      event.currentTarget.releasePointerCapture(rotateState.pointerId);
    }
    setRotateState(null);
    setInteraction(null);
  };

  const selectedZone = zones.find(zone => zone.key === selectedZoneKey) ?? zones[0];
  const selectedZoneIndex = selectedZone ? zones.findIndex(zone => zone.key === selectedZone.key) : -1;
  const selectedBox = selectedZone && selectedZoneIndex >= 0 ? getZoneBox(selectedZone, selectedZoneIndex) : null;
  const referenceZone = zones.find(zone => zone.key === referenceZoneKey && zone.key !== selectedZone?.key) ?? null;
  const referenceZoneIndex = referenceZone ? zones.findIndex(zone => zone.key === referenceZone.key) : -1;
  const referenceBox = referenceZone && referenceZoneIndex >= 0 ? getZoneBox(referenceZone, referenceZoneIndex) : null;
  const referenceOptions = zones.filter(zone => zone.key !== selectedZone?.key);

  const updateSelectedLayout = (patch: Partial<Pick<ZoneForm, 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation'>>) => {
    if (!selectedZone) return;
    updateZoneLayout(selectedZone.key, patch);
  };

  const requireReference = () => {
    if (!referenceZone || !referenceBox) {
      toast.error(language === 'en' ? 'Choose a reference zone first' : 'Chọn khu làm chuẩn trước');
      return null;
    }
    return { zone: referenceZone, box: referenceBox };
  };

  const alignSelectedToCanvas = (alignment: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => {
    if (!selectedZone || !selectedBox) return;
    const patch: Partial<Pick<ZoneForm, 'layout_x' | 'layout_y'>> = {};
    if (alignment === 'left') patch.layout_x = 0;
    if (alignment === 'centerX') patch.layout_x = 50 - selectedBox.width / 2;
    if (alignment === 'right') patch.layout_x = 100 - selectedBox.width;
    if (alignment === 'top') patch.layout_y = 12;
    if (alignment === 'centerY') patch.layout_y = 50 - selectedBox.height / 2;
    if (alignment === 'bottom') patch.layout_y = 100 - selectedBox.height;
    updateSelectedLayout(patch);
  };

  const alignSelectedToReference = (alignment: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => {
    if (!selectedBox) return;
    const reference = requireReference();
    if (!reference) return;

    const patch: Partial<Pick<ZoneForm, 'layout_x' | 'layout_y'>> = {};
    if (alignment === 'left') patch.layout_x = reference.box.x;
    if (alignment === 'centerX') patch.layout_x = reference.box.x + reference.box.width / 2 - selectedBox.width / 2;
    if (alignment === 'right') patch.layout_x = reference.box.x + reference.box.width - selectedBox.width;
    if (alignment === 'top') patch.layout_y = reference.box.y;
    if (alignment === 'centerY') patch.layout_y = reference.box.y + reference.box.height / 2 - selectedBox.height / 2;
    if (alignment === 'bottom') patch.layout_y = reference.box.y + reference.box.height - selectedBox.height;
    updateSelectedLayout(patch);
  };

  const matchReferenceSize = (mode: 'width' | 'height' | 'both') => {
    const reference = requireReference();
    if (!reference) return;
    updateSelectedLayout({
      ...(mode === 'width' || mode === 'both' ? { layout_width: reference.box.width } : {}),
      ...(mode === 'height' || mode === 'both' ? { layout_height: reference.box.height } : {}),
    });
  };

  const copyReferenceAngle = () => {
    const reference = requireReference();
    if (!reference) return;
    updateSelectedLayout({ layout_rotation: reference.box.rotation });
  };

  const mirrorSelectedFromReference = () => {
    if (!selectedBox) return;
    const source = referenceBox ?? selectedBox;
    updateSelectedLayout({
      layout_x: 100 - source.x - source.width,
      layout_y: source.y,
      layout_width: source.width,
      layout_height: source.height,
      layout_rotation: normalizeRotation(-signedRotation(source.rotation)),
    });
  };

  const handleSelectedLayoutInput = (field: 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation', value: string) => {
    if (!selectedZone) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    updateSelectedLayout({ [field]: field === 'layout_rotation' ? normalizeRotation(number) : number } as Partial<Pick<ZoneForm, 'layout_x' | 'layout_y' | 'layout_width' | 'layout_height' | 'layout_rotation'>>);
  };

  const handleCanvasKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selectedZone || !selectedBox) return;
    const step = event.shiftKey ? 5 : 1;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

    event.preventDefault();
    const patch: Partial<Pick<ZoneForm, 'layout_x' | 'layout_y'>> = {};
    if (event.key === 'ArrowLeft') patch.layout_x = selectedBox.x - step;
    if (event.key === 'ArrowRight') patch.layout_x = selectedBox.x + step;
    if (event.key === 'ArrowUp') patch.layout_y = selectedBox.y - step;
    if (event.key === 'ArrowDown') patch.layout_y = selectedBox.y + step;
    const nextBox = {
      ...selectedBox,
      x: patch.layout_x ?? selectedBox.x,
      y: patch.layout_y ?? selectedBox.y,
    };
    updateSelectedLayout(patch);
    showInteraction(selectedZone, 'move', nextBox);
  };

  const totalCapacity = zones.reduce((sum, zone) => sum + Number(zone.rows || 0) * Number(zone.cols || 0), 0);

  const handleSave = async () => {
    const validationMessage = validateForm(form, language);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const validZones = zones
      .map((zone, index) => {
        const fallback = defaultZonePlacement(index, zones.length);
        return {
          ...zone,
          name: zone.name.trim(),
          price: Math.max(0, Number(zone.price) || 0),
          rows: Math.max(1, Number(zone.rows) || 1),
          cols: Math.max(1, Number(zone.cols) || 1),
          layout_x: clampPercent(zone.layout_x, fallback.x, 0, 92),
          layout_y: clampPercent(zone.layout_y, fallback.y, 12, 94),
          layout_width: clampPercent(zone.layout_width, fallback.width, MIN_LAYOUT_SIZE, Math.max(MIN_LAYOUT_SIZE, 100 - clampPercent(zone.layout_x, fallback.x, 0, 92))),
          layout_height: clampPercent(zone.layout_height, fallback.height, MIN_LAYOUT_SIZE, Math.max(MIN_LAYOUT_SIZE, 100 - clampPercent(zone.layout_y, fallback.y, 12, 94))),
          layout_rotation: normalizeRotation(zone.layout_rotation),
        };
      })
      .filter(zone => zone.name);

    if (validZones.length === 0) {
      toast.error(language === 'en' ? 'At least one zone is required' : 'Cần ít nhất một khu ghế');
      return;
    }
    if (new Set(validZones.map(zone => zone.name.toLowerCase())).size !== validZones.length) {
      toast.error(language === 'en' ? 'Zone names must be unique' : 'Tên khu ghế không được trùng');
      return;
    }

    setSaving(true);
    const eventId = routeEventId ?? Date.now();
    const nowIso = new Date().toISOString();
    const createdAt = editingEvent?.created_at ?? nowIso;
    const seatPlan = normalizeSeatPlan(form.seat_plan, validZones);
    const eventDraft: Event = {
      id: eventId,
      title: form.title.trim(),
      description: form.description.trim() || 'Sự kiện mới được tạo trong admin.',
      location: form.location.trim(),
      event_time: form.event_time,
      seat_plan: seatPlan,
      seat_map_image_url: form.seat_map_image_url || undefined,
      sale_start_time: form.sale_start_time,
      sale_end_time: form.sale_end_time,
      status: 'draft',
      banner_url: form.banner_url || DEFAULT_BANNER,
      created_by: editingEvent?.created_by ?? user?.id ?? 1,
      created_at: createdAt,
      updated_at: nowIso,
    };
    const eventToSave: Event = { ...eventDraft, status: getAutoEventStatus(eventDraft) };

    let nextZoneId = Math.max(eventId * 100, ...validZones.map(zone => zone.zoneId ?? 0)) + 1;
    const nextZones: SeatZone[] = validZones.map(zone => {
      const zoneId = zone.zoneId ?? nextZoneId++;
      return {
        id: zoneId,
        event_id: eventId,
        name: zone.name,
        price: zone.price,
        total_capacity: zone.rows * zone.cols,
        color: zone.color,
        created_at: zone.createdAt ?? createdAt,
        updated_at: nowIso,
      };
    });
    const layouts: ZoneLayout[] = validZones.map((zone, index) => ({
      zone_id: nextZones[index].id,
      rows: zone.rows,
      cols: zone.cols,
      color: zone.color,
      x: zone.layout_x,
      y: zone.layout_y,
      width: zone.layout_width,
      height: zone.layout_height,
      rotation: zone.layout_rotation,
    }));

    try {
      if (isEdit) {
        await updateEventData(eventId, eventToSave, nextZones, layouts);
        toast.success(language === 'en' ? 'Event updated' : 'Đã cập nhật sự kiện');
      } else {
        await addEvent(eventToSave, nextZones, layouts);
        toast.success(language === 'en' ? 'Event created' : 'Đã tạo sự kiện');
      }
      navigate('/admin/events');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'en' ? 'Could not save event' : 'Không thể lưu sự kiện'));
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full rounded-md px-3 py-2.5 outline-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100";

  if (isEdit && !editingEvent) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-black">{language === 'en' ? 'Event not found' : 'Không tìm thấy sự kiện'}</h1>
          <button onClick={() => navigate('/admin/events')} className="mt-4 rounded-md px-4 py-2 text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            {language === 'en' ? 'Event list' : 'Danh sách sự kiện'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-black uppercase text-orange-500">{language === 'en' ? 'Event & Zones' : 'Sự kiện và khu ghế'}</p>
            <h1 className="text-2xl font-black">{isEdit ? (language === 'en' ? 'Edit Event' : 'Sửa sự kiện') : (language === 'en' ? 'Create Event' : 'Tạo sự kiện')}</h1>
          </div>
          <button onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-bold text-white ${saving ? 'bg-orange-300 dark:bg-orange-800' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={17} />}
            {isEdit ? (language === 'en' ? 'Save changes' : 'Lưu thay đổi') : (language === 'en' ? 'Save' : 'Lưu')}
          </button>
        </div>
      </header>

      <div className="grid max-w-7xl gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5">
          <div className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h2 className="mb-5 text-lg font-black">{language === 'en' ? 'Event Details' : 'Thông tin sự kiện'}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Event Name' : 'Tên sự kiện'}</label>
                <input value={form.title} onChange={event => updateForm('title', event.target.value)} className={inputClassName} placeholder="Sky Tour 2026" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Location' : 'Địa điểm'}</label>
                <input value={form.location} onChange={event => updateForm('location', event.target.value)} className={inputClassName} placeholder={language === 'en' ? 'My Dinh Stadium, Hanoi' : 'Sân vận động Mỹ Đình, Hà Nội'} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Event Time' : 'Thời gian diễn ra'}</label>
                <input type="datetime-local" value={form.event_time} onChange={event => updateForm('event_time', event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Sale Start' : 'Bắt đầu mở bán'}</label>
                <input type="datetime-local" value={form.sale_start_time} onChange={event => updateForm('sale_start_time', event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Sale End' : 'Kết thúc bán vé'}</label>
                <input type="datetime-local" value={form.sale_end_time} onChange={event => updateForm('sale_end_time', event.target.value)} className={inputClassName} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Banner Image' : 'Ảnh banner'}</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 hover:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <Upload size={17} className="text-orange-500" />
                  {language === 'en' ? 'Choose banner image' : 'Chọn ảnh banner'}
                  <input type="file" accept="image/*" onChange={handleImageFile('banner_url')} className="sr-only" />
                </label>
                {form.banner_url && <img src={form.banner_url} alt="" className="mt-3 h-36 w-full rounded-md object-cover" />}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Seat Map Image' : 'Ảnh sơ đồ ghế'}</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <Upload size={17} className="text-sky-500" />
                  {language === 'en' ? 'Choose seat map image' : 'Chọn ảnh sơ đồ ghế'}
                  <input type="file" accept="image/*" onChange={handleImageFile('seat_map_image_url')} className="sr-only" />
                </label>
                {form.seat_map_image_url && (
                  <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                    <img src={form.seat_map_image_url} alt="" className="max-h-96 w-full object-contain" />
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Description' : 'Mô tả'}</label>
                <textarea value={form.description} onChange={event => updateForm('description', event.target.value)} rows={4} className={inputClassName} />
              </div>
            </div>
          </div>

        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">{language === 'en' ? 'Zones' : 'Khu ghế'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{totalCapacity.toLocaleString()} {language === 'en' ? 'seats' : 'ghế'}</p>
              </div>
              <button type="button" onClick={addZone} className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-100 px-3 py-2 text-sm font-bold text-sky-700 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-400">
                <Plus size={15} /> {language === 'en' ? 'Add' : 'Thêm'}
              </button>
            </div>

            <div className="space-y-4">
              {zones.map((zone, index) => (
                <div key={zone.key} className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: zone.color }} />
                      <b>{language === 'en' ? 'Zone' : 'Khu'} {index + 1}</b>
                    </div>
                    <button type="button" onClick={() => removeZone(zone.key)} className="rounded-md bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Zone Name' : 'Tên khu'}</label>
                      <input value={zone.name} onChange={event => updateZone(zone.key, 'name', event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Rows' : 'Số hàng'}</label>
                      <input type="number" min="1" value={zone.rows} onChange={event => updateZone(zone.key, 'rows', Number(event.target.value))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Cols' : 'Số cột'}</label>
                      <input type="number" min="1" value={zone.cols} onChange={event => updateZone(zone.key, 'cols', Number(event.target.value))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Price' : 'Giá vé'}</label>
                      <input type="number" min="0" step="50000" value={zone.price} onChange={event => updateZone(zone.key, 'price', Number(event.target.value))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {COLORS.map(color => (
                      <button key={color} type="button" onClick={() => updateZone(zone.key, 'color', color)} className="h-7 w-7 rounded-md" style={{ background: color, boxShadow: zone.color === color ? '0 0 0 2px #38BDF8' : 'none' }} title={color} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
