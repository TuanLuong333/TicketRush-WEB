import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../store/AppContext';
import type { Event, SeatZone, ZoneLayout } from '../../data/types';
import { getAutoEventStatus } from '../../data/mockData';
import { usePreferences } from '../../store/PreferencesContext';

interface ZoneForm {
  id: string;
  name: string;
  price: number;
  rows: number;
  cols: number;
  color: string;
}

const COLORS = ['#F97316', '#0EA5E9', '#16A34A', '#7C3AED', '#F43F5E', '#64748B'];
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1280&q=80';

function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addHours(value: string, hours: number): string {
  const date = new Date(value);
  date.setHours(date.getHours() + hours);
  return toLocalInput(date);
}

export default function AdminCreateEventPage() {
  const navigate = useNavigate();
  const { addEvent, user } = useApp();
  const { language, t } = usePreferences();
  const now = toLocalInput(new Date());
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    event_time: '',
    seat_plan: 'stadium-360',
    queue_enabled: false,
    sale_start_time: now,
    sale_end_time: '',
    banner_url: '',
  });
  const [zones, setZones] = useState<ZoneForm[]>([
    { id: '1', name: 'VIP', price: 2200000, rows: 3, cols: 10, color: '#F97316' },
    { id: '2', name: 'A', price: 1200000, rows: 5, cols: 12, color: '#0EA5E9' },
    { id: '3', name: 'B', price: 750000, rows: 5, cols: 12, color: '#7C3AED' },
  ]);
  const [saving, setSaving] = useState(false);

  const updateForm = (key: keyof typeof form, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));
  const updateZone = (id: string, key: keyof ZoneForm, value: string | number) => {
    setZones(prev => prev.map(zone => zone.id === id ? { ...zone, [key]: value } : zone));
  };

  const addZone = () => {
    setZones(prev => [
      ...prev,
      {
        id: String(Date.now()),
        name: `Khu ${prev.length + 1}`,
        price: 500000,
        rows: 4,
        cols: 10,
        color: COLORS[prev.length % COLORS.length],
      },
    ]);
  };

  const removeZone = (id: string) => setZones(prev => prev.filter(zone => zone.id !== id));
  const totalCapacity = zones.reduce((sum, zone) => sum + zone.rows * zone.cols, 0);

  const handleSave = async () => {
    if (!form.title || !form.location || !form.event_time || !form.sale_start_time) {
      toast.error('Vui lòng nhập đủ tên sự kiện, địa điểm, thời gian diễn ra và thời gian mở bán');
      return;
    }
    const validZones = zones
      .map(zone => ({
        ...zone,
        name: zone.name.trim(),
        price: Math.max(0, Number(zone.price) || 0),
        rows: Math.max(1, Number(zone.rows) || 1),
        cols: Math.max(1, Number(zone.cols) || 1),
      }))
      .filter(zone => zone.name);

    if (validZones.length === 0) {
      toast.error('Cần ít nhất một khu ghế');
      return;
    }
    if (new Set(validZones.map(zone => zone.name.toLowerCase())).size !== validZones.length) {
      toast.error('Tên khu ghế không được trùng');
      return;
    }

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    const eventId = Date.now();
    const createdAt = new Date().toISOString();
    const seatPlan = form.queue_enabled && !form.seat_plan.includes('queue')
      ? `${form.seat_plan}|queue`
      : form.seat_plan;
    const eventDraft: Event = {
      id: eventId,
      title: form.title.trim(),
      description: form.description.trim() || 'Sự kiện mới được tạo trong admin.',
      location: form.location.trim(),
      event_time: form.event_time,
      seat_plan: seatPlan,
      sale_start_time: form.sale_start_time,
      sale_end_time: form.sale_end_time || addHours(form.event_time, -1),
      status: 'draft',
      banner_url: form.banner_url.trim() || DEFAULT_BANNER,
      created_by: user?.id ?? 1,
      created_at: createdAt,
      updated_at: createdAt,
    };
    const event: Event = { ...eventDraft, status: getAutoEventStatus(eventDraft) };
    const nextZones: SeatZone[] = validZones.map((zone, index) => ({
      id: eventId * 100 + index + 1,
      event_id: eventId,
      name: zone.name,
      price: zone.price,
      total_capacity: zone.rows * zone.cols,
      color: zone.color,
      created_at: createdAt,
      updated_at: createdAt,
    }));
    const layouts: ZoneLayout[] = validZones.map((zone, index) => ({
      zone_id: eventId * 100 + index + 1,
      rows: zone.rows,
      cols: zone.cols,
      color: zone.color,
    }));

    try {
      await addEvent(event, nextZones, layouts);
      toast.success('Đã tạo sự kiện');
      navigate('/admin/events');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo sự kiện');
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full rounded-md px-3 py-2.5 outline-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-md p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="mb-1 text-sm font-black uppercase text-orange-500">{language === 'en' ? 'Event & Zones' : 'Sự kiện và khu ghế'}</p>
              <h1 className="text-2xl font-black">{language === 'en' ? 'Create Event' : 'Tạo sự kiện'}</h1>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-bold text-white ${saving ? 'bg-orange-300 dark:bg-orange-800' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={17} />}
            {language === 'en' ? 'Save' : 'Lưu'}
          </button>
        </div>
      </header>

      <div className="grid max-w-6xl gap-6 p-6 xl:grid-cols-[1fr_420px]">
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
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Event Time' : 'Thời gian diễn ra'}</label>
                <input type="datetime-local" value={form.event_time} onChange={event => updateForm('event_time', event.target.value)} className={inputClassName} />
              </div>
              <div className="rounded-md p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                <div className="text-sm font-black">{language === 'en' ? 'Auto Status' : 'Trạng thái tự động'}</div>
                <div className="text-xs leading-5">{language === 'en' ? 'Ticket labels are calculated from sale start, end, event time and available seats.' : 'Nhãn bán vé được tính từ thời gian mở bán, kết thúc bán, thời gian diễn ra và số ghế còn lại.'}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Sale Start' : 'Bắt đầu mở bán'}</label>
                <input type="datetime-local" value={form.sale_start_time} onChange={event => updateForm('sale_start_time', event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Sale End' : 'Kết thúc mở bán'}</label>
                <input type="datetime-local" value={form.sale_end_time} onChange={event => updateForm('sale_end_time', event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Seat Plan Code' : 'Mã sơ đồ ghế'}</label>
                <input value={form.seat_plan} onChange={event => updateForm('seat_plan', event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Banner Image URL' : 'Đường dẫn ảnh bìa'}</label>
                <input value={form.banner_url} onChange={event => updateForm('banner_url', event.target.value)} className={inputClassName} placeholder="https://..." />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Description' : 'Mô tả'}</label>
                <textarea value={form.description} onChange={event => updateForm('description', event.target.value)} rows={4} className={inputClassName} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-md p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
                <div>
                  <div className="font-black text-orange-700 dark:text-orange-400">{language === 'en' ? 'Enable Queue' : 'Bật hàng chờ'}</div>
                  <div className="text-sm text-orange-800 dark:text-orange-300">{language === 'en' ? 'Seat plan code will get a |queue suffix' : 'Mã sơ đồ ghế sẽ thêm hậu tố |queue'}</div>
                </div>
                <button onClick={() => updateForm('queue_enabled', !form.queue_enabled)} className={`relative h-6 w-11 rounded-full ${form.queue_enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <span className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all" style={{ left: form.queue_enabled ? 24 : 4 }} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">{language === 'en' ? 'Zones' : 'Khu ghế'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{totalCapacity.toLocaleString()} {language === 'en' ? 'seats' : 'ghế'}</p>
              </div>
              <button onClick={addZone} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                <Plus size={15} /> {language === 'en' ? 'Add' : 'Thêm'}
              </button>
            </div>

            <div className="space-y-4">
              {zones.map((zone, index) => (
                <div key={zone.id} className="rounded-md p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: zone.color }} />
                      <b>{language === 'en' ? 'Zone' : 'Khu'} {index + 1}</b>
                    </div>
                    <button onClick={() => removeZone(zone.id)} className="rounded-md p-1.5 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Zone Name' : 'Tên khu'}</label>
                      <input value={zone.name} onChange={event => updateZone(zone.id, 'name', event.target.value)} className="w-full rounded-md px-3 py-2 text-sm outline-none bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Rows' : 'Số hàng'}</label>
                      <input type="number" min="1" value={zone.rows} onChange={event => updateZone(zone.id, 'rows', Number(event.target.value))} className="w-full rounded-md px-3 py-2 text-sm outline-none bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Cols' : 'Số cột'}</label>
                      <input type="number" min="1" value={zone.cols} onChange={event => updateZone(zone.id, 'cols', Number(event.target.value))} className="w-full rounded-md px-3 py-2 text-sm outline-none bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700" />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{language === 'en' ? 'Price' : 'Giá vé'}</label>
                      <input type="number" min="0" step="50000" value={zone.price} onChange={event => updateZone(zone.id, 'price', Number(event.target.value))} className="w-full rounded-md px-3 py-2 text-sm outline-none bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700" />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {COLORS.map(color => (
                      <button key={color} onClick={() => updateZone(zone.id, 'color', color)} className="h-6 w-6 rounded-sm" style={{ background: color, boxShadow: zone.color === color ? `0 0 0 2px #0F172A` : 'none' }} />
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
