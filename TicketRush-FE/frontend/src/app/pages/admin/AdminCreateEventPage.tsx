import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../store/AppContext';
import { AUTO_QUEUE_MARKER, QUEUE_FEATURE_ENABLED } from '../../data/types';
import type { Event, SeatZone, ZoneLayout } from '../../data/types';
import { getAutoEventStatus } from '../../data/mockData';
import { usePreferences } from '../../store/PreferencesContext';
import { AutocompleteInput, AutocompleteTextarea, uniqueAutocompleteSuggestions } from '../../components/AutocompleteInput';

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

type ZoneFormField = keyof Pick<ZoneForm, 'name' | 'price' | 'rows' | 'cols' | 'color'>;

interface ZonePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
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
  banner_file?: File;
  seat_map_image_url: string;
  seat_map_file?: File;
}

const COLORS = ['#F97316', '#0EA5E9', '#16A34A', '#7C3AED', '#F43F5E', '#64748B'];
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1280&q=80';
const SEAT_PLAN_LAYOUT_PREFIX = 'layout:';
const MIN_LAYOUT_SIZE = 10;

function normalizeColor(value?: string): string {
  return String(value || '').trim().toLowerCase();
}

function componentToHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const match = lightness - chroma / 2;
  const [red, green, blue] = hue < 60
    ? [chroma, x, 0]
    : hue < 120
      ? [x, chroma, 0]
      : hue < 180
        ? [0, chroma, x]
        : hue < 240
          ? [0, x, chroma]
          : hue < 300
            ? [x, 0, chroma]
            : [chroma, 0, x];

  return `#${componentToHex((red + match) * 255)}${componentToHex((green + match) * 255)}${componentToHex((blue + match) * 255)}`.toUpperCase();
}

function generatedZoneColor(index: number): string {
  const hue = (24 + index * 137.508) % 360;
  return hslToHex(hue, 0.74, 0.52);
}

function getNextZoneColor(existingZones: Array<Pick<ZoneForm, 'color'>>): string {
  const usedColors = new Set(existingZones.map(zone => normalizeColor(zone.color)).filter(Boolean));
  const unusedPreset = COLORS.find(color => !usedColors.has(normalizeColor(color)));
  if (unusedPreset) return unusedPreset;

  for (let index = 0; index < 360; index += 1) {
    const color = generatedZoneColor(existingZones.length + index);
    if (!usedColors.has(normalizeColor(color))) return color;
  }

  return generatedZoneColor(Date.now() % 360);
}

function hasDuplicateZoneColors(zones: Array<Pick<ZoneForm, 'color'>>): boolean {
  const colors = zones.map(zone => normalizeColor(zone.color)).filter(Boolean);
  return new Set(colors).size !== colors.length;
}

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
  // Queue code is temporarily disabled by QUEUE_FEATURE_ENABLED.
  const queueMarker = QUEUE_FEATURE_ENABLED ? `|${AUTO_QUEUE_MARKER}` : '';
  return `${base}${queueMarker}|${encodeSeatPlanLayout(zones)}`;
}

function clampPercent(value: unknown, fallback: number, min: number, max: number): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function normalizeRotation(value: number): number {
  const normalized = value % 360;
  return Math.round((normalized < 0 ? normalized + 360 : normalized) * 10) / 10;
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
  const { addEvent, updateEventData, events, seatZones, getEvent, getZones, getZoneLayout, user } = useApp();
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
  const eventTitleSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions(events.map(event => event.title)),
    [events],
  );
  const eventLocationSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions(events.map(event => event.location)),
    [events],
  );
  const eventDescriptionSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions(events.map(event => event.description)),
    [events],
  );
  const zoneNameSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions([...seatZones.map(zone => zone.name), ...zones.map(zone => zone.name)]),
    [seatZones, zones],
  );
  const zoneRowSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions([
      ...seatZones.map(zone => getZoneLayout(zone.id)?.rows),
      ...zones.map(zone => zone.rows),
    ]),
    [getZoneLayout, seatZones, zones],
  );
  const zoneColSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions([
      ...seatZones.map(zone => getZoneLayout(zone.id)?.cols),
      ...zones.map(zone => zone.cols),
    ]),
    [getZoneLayout, seatZones, zones],
  );
  const zonePriceSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions([...seatZones.map(zone => zone.price), ...zones.map(zone => zone.price)]),
    [seatZones, zones],
  );

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

  const updateForm = (key: keyof EventFormState, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));
  const updateZone = (key: string, field: ZoneFormField, value: string | number) => {
    setZones(prev => {
      if (field === 'color') {
        const nextColor = normalizeColor(String(value));
        const duplicated = prev.some(zone => zone.key !== key && normalizeColor(zone.color) === nextColor);
        if (duplicated) {
          toast.error(language === 'en' ? 'Two zones cannot use the same color' : 'Hai khu ghế không được chọn cùng màu');
          return prev;
        }
      }
      return prev.map(zone => zone.key === key ? { ...zone, [field]: value } : zone);
    });
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
      if (typeof reader.result === 'string') {
        setForm(prev => ({ 
          ...prev, 
          [field]: reader.result, 
          [field === 'banner_url' ? 'banner_file' : 'seat_map_file']: file 
        }));
      }
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
        color: getNextZoneColor(prev),
      }, prev.length, prev.length + 1),
    ]);
  };

  const removeZone = (key: string) => {
    if (zones.length === 1) {
      toast.error(language === 'en' ? 'At least one zone is required' : 'Cần ít nhất một khu ghế');
      return;
    }
    setZones(prev => prev.filter(zone => zone.key !== key));
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
    if (hasDuplicateZoneColors(validZones)) {
      toast.error(language === 'en' ? 'Zone colors must be unique' : 'Màu khu ghế không được trùng');
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
      seat_map_file: form.seat_map_file,
      sale_start_time: form.sale_start_time,
      sale_end_time: form.sale_end_time,
      status: 'draft',
      banner_url: form.banner_url || DEFAULT_BANNER,
      banner_file: form.banner_file,
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
                <AutocompleteInput
                  value={form.title}
                  onChange={value => updateForm('title', value)}
                  suggestions={eventTitleSuggestions}
                  className={inputClassName}
                  placeholder="Sky Tour 2026"
                  emptyText={language === 'en' ? 'No matching suggestion' : 'Không có gợi ý phù hợp'}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Location' : 'Địa điểm'}</label>
                <AutocompleteInput
                  value={form.location}
                  onChange={value => updateForm('location', value)}
                  suggestions={eventLocationSuggestions}
                  className={inputClassName}
                  placeholder={language === 'en' ? 'My Dinh Stadium, Hanoi' : 'Sân vận động Mỹ Đình, Hà Nội'}
                  emptyText={language === 'en' ? 'No matching suggestion' : 'Không có gợi ý phù hợp'}
                />
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
                <AutocompleteTextarea
                  value={form.description}
                  onChange={value => updateForm('description', value)}
                  suggestions={eventDescriptionSuggestions}
                  rows={4}
                  className={inputClassName}
                  emptyText={language === 'en' ? 'No matching suggestion' : 'Không có gợi ý phù hợp'}
                />
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
                      <AutocompleteInput
                        value={zone.name}
                        onChange={value => updateZone(zone.key, 'name', value)}
                        suggestions={zoneNameSuggestions}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                        emptyText={language === 'en' ? 'No matching suggestion' : 'Không có gợi ý phù hợp'}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Rows' : 'Số hàng'}</label>
                      <AutocompleteInput
                        type="number"
                        min="1"
                        value={String(zone.rows)}
                        onChange={value => updateZone(zone.key, 'rows', Number(value))}
                        suggestions={zoneRowSuggestions}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                        emptyText={language === 'en' ? 'No matching suggestion' : 'Không có gợi ý phù hợp'}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Cols' : 'Số cột'}</label>
                      <AutocompleteInput
                        type="number"
                        min="1"
                        value={String(zone.cols)}
                        onChange={value => updateZone(zone.key, 'cols', Number(value))}
                        suggestions={zoneColSuggestions}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                        emptyText={language === 'en' ? 'No matching suggestion' : 'Không có gợi ý phù hợp'}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Price' : 'Giá vé'}</label>
                      <AutocompleteInput
                        type="number"
                        min="0"
                        step="50000"
                        value={String(zone.price)}
                        onChange={value => updateZone(zone.key, 'price', Number(value))}
                        suggestions={zonePriceSuggestions}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                        emptyText={language === 'en' ? 'No matching suggestion' : 'Không có gợi ý phù hợp'}
                      />
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
