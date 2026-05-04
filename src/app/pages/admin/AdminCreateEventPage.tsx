import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../store/AppContext';
import type { PriceTier, EventStatus, Event, VenueSection } from '../../data/types';
import { PRICE_TIER_CONFIG } from '../../data/types';

/** Mirrors a VenueSection form row (subset of event_seats aggregate) */
interface SectionForm {
  id: string;
  section_name: string;
  price_tier: PriceTier;
  price: number;
  rows: number;
  cols: number;
  color: string;
}

const TIER_OPTIONS: PriceTier[] = ['VIP', 'STANDARD', 'ECONOMY', 'GENERAL'];
const SECTION_COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#EC4899'];

const CITIES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
const DEFAULT_BANNER_URL =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1080&q=80';

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addHours(dateTimeLocal: string, hours: number): string {
  const date = new Date(dateTimeLocal);
  if (Number.isNaN(date.getTime())) return dateTimeLocal;
  date.setHours(date.getHours() + hours);
  return formatDateTimeLocal(date);
}

export default function AdminCreateEventPage() {
  const navigate = useNavigate();
  const { addEvent, user } = useApp();

  /** Mirrors the `events` table columns */
  const [form, setForm] = useState({
    title: '',
    artist: '',         // stored in meta JSONB
    date_start: '',
    date_end: '',
    venue: '',
    city: 'Hà Nội',
    description: '',
    genres: '',
    banner_url: '',
    status: 'on_sale' as EventStatus,
    has_queue: false,   // if true → create a queue row
    flash_sale_ends: '',
  });

  /** Mirrors event_seats aggregate config (VenueSection) */
  const [sections, setSections] = useState<SectionForm[]>([
    { id: '1', section_name: 'VIP',     price_tier: 'VIP',      price: 2000000, rows: 3, cols: 10, color: '#F59E0B' },
    { id: '2', section_name: 'A',       price_tier: 'STANDARD',  price: 1000000, rows: 5, cols: 12, color: '#3B82F6' },
    { id: '3', section_name: 'B',       price_tier: 'ECONOMY',   price: 700000,  rows: 5, cols: 12, color: '#8B5CF6' },
    { id: '4', section_name: 'GENERAL', price_tier: 'GENERAL',   price: 350000,  rows: 6, cols: 15, color: '#6B7280' },
  ]);

  const [saving, setSaving] = useState(false);

  const updateForm = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const updateSection = (id: string, k: keyof SectionForm, v: string | number) =>
    setSections(prev => prev.map(s => s.id === id ? { ...s, [k]: v } : s));

  const addSection = () => {
    const id = Date.now().toString();
    setSections(prev => [...prev, {
      id, section_name: `K${prev.length + 1}`, price_tier: 'GENERAL',
      price: 500000, rows: 4, cols: 10, color: SECTION_COLORS[prev.length % SECTION_COLORS.length],
    }]);
  };

  const removeSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));

  const totalSeats = sections.reduce((s, sec) => s + sec.rows * sec.cols, 0);

  const handleSave = async () => {
    if (!form.title || !form.artist || !form.date_start || !form.venue) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const validSections = sections
      .map(section => ({
        ...section,
        section_name: section.section_name.trim(),
        rows: Math.max(1, Number(section.rows) || 1),
        cols: Math.max(1, Number(section.cols) || 1),
        price: Math.max(0, Number(section.price) || 0),
      }))
      .filter(section => section.section_name);

    if (validSections.length === 0) {
      toast.error('Cần ít nhất một khu ghế hợp lệ');
      return;
    }

    const sectionNames = validSections.map(section => section.section_name.toLowerCase());
    if (new Set(sectionNames).size !== sectionNames.length) {
      toast.error('Tên khu ghế không được trùng nhau');
      return;
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    const venueSections: VenueSection[] = validSections.map(section => ({
      section_name: section.section_name,
      price_tier: section.price_tier,
      price: section.price,
      color: section.color,
      total_seats: section.rows * section.cols,
      sold_seats: 0,
      rows: section.rows,
      cols: section.cols,
    }));
    const event: Event = {
      id: `evt-${Date.now()}`,
      organizer_id: user?.id ?? 'admin-001',
      title: form.title.trim(),
      artist: form.artist.trim(),
      description: form.description.trim() || 'Sự kiện mới được tạo trên TicketRush.',
      venue: form.venue.trim(),
      city: form.city,
      date_start: form.date_start,
      date_end: form.date_end || addHours(form.date_start, 3),
      banner_url: form.banner_url.trim() || DEFAULT_BANNER_URL,
      status: form.status,
      genres: form.genres.split(',').map(g => g.trim()).filter(Boolean),
      sections: venueSections,
      total_seats: venueSections.reduce((sum, section) => sum + section.total_seats, 0),
      sold_seats: 0,
      has_queue: form.has_queue,
      flash_sale_ends: form.has_queue ? (form.flash_sale_ends || addHours(form.date_start, 1)) : undefined,
      featured: false,
      created_at: new Date().toISOString(),
    };
    addEvent(event);
    setSaving(false);
    toast.success('Tạo sự kiện thành công!');
    navigate('/admin/events');
  };

  const fieldStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 10,
    padding: '10px 12px',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem' }}>Tạo sự kiện mới</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Tổng: {totalSeats.toLocaleString()} ghế • {sections.length} khu vực
            </p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
          style={{
            background: saving ? 'rgba(255,107,53,0.4)' : 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
          }}>
          {saving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Save size={15} /> Lưu sự kiện</>}
        </button>
      </div>

      <div className="p-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-5">
            {/* Basic Info — mirrors events table */}
            <div className="p-5 rounded-2xl space-y-4"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ color: '#fff', fontWeight: 600 }}>Thông tin cơ bản</h3>

              <div>
                <label style={labelStyle}>Tên sự kiện * <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.title</span></label>
                <input value={form.title} onChange={e => updateForm('title', e.target.value)}
                  placeholder="VD: Sky Tour 2026" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nghệ sĩ / Ban nhạc * <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.meta.artist</span></label>
                <input value={form.artist} onChange={e => updateForm('artist', e.target.value)}
                  placeholder="VD: Sơn Tùng M-TP" style={fieldStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Bắt đầu * <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.date_start</span></label>
                  <input type="datetime-local" value={form.date_start} onChange={e => updateForm('date_start', e.target.value)}
                    style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kết thúc <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.date_end</span></label>
                  <input type="datetime-local" value={form.date_end} onChange={e => updateForm('date_end', e.target.value)}
                    style={fieldStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Địa điểm * <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.venue</span></label>
                <input value={form.venue} onChange={e => updateForm('venue', e.target.value)}
                  placeholder="VD: Sân vận động Mỹ Đình" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Thành phố <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.city</span></label>
                <select value={form.city} onChange={e => updateForm('city', e.target.value)}
                  style={{ ...fieldStyle, cursor: 'pointer' }}>
                  {CITIES.map(c => (
                    <option key={c} value={c} style={{ background: '#12122A' }}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Thể loại <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.meta.genres (dấu phẩy)</span></label>
                <input value={form.genres} onChange={e => updateForm('genres', e.target.value)}
                  placeholder="Pop, R&B, Hip-hop" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Banner URL <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.banner_url</span></label>
                <input value={form.banner_url} onChange={e => updateForm('banner_url', e.target.value)}
                  placeholder="https://..." style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mô tả sự kiện <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.description</span></label>
                <textarea value={form.description} onChange={e => updateForm('description', e.target.value)}
                  placeholder="Giới thiệu về sự kiện..."
                  rows={3}
                  style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Trạng thái <span style={{ color: 'rgba(255,255,255,0.25)' }}>events.status</span></label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value as EventStatus)}
                  style={{ ...fieldStyle, cursor: 'pointer' }}>
                  {(['draft', 'on_sale', 'sold_out', 'cancelled', 'ended'] as EventStatus[]).map(s => (
                    <option key={s} value={s} style={{ background: '#12122A' }}>
                      {s === 'draft' ? 'Bản nháp' : s === 'on_sale' ? 'Đang bán' : s === 'sold_out' ? 'Hết vé' : s === 'cancelled' ? 'Đã hủy' : 'Đã kết thúc'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Queue settings — mirrors queue table */}
            <div className="p-5 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4" style={{ color: '#fff', fontWeight: 600 }}>
                Hàng chờ ảo <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>queue table</span>
              </h3>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm" style={{ color: '#fff' }}>Bật hàng chờ (Flash Sale)</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Tạo bản ghi trong bảng queue + queue_entries
                  </div>
                </div>
                <button onClick={() => updateForm('has_queue', !form.has_queue)}
                  className="w-11 h-6 rounded-full transition-all relative"
                  style={{ background: form.has_queue ? '#FF6B35' : 'rgba(255,255,255,0.15)' }}>
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
                    style={{ left: form.has_queue ? 26 : 4 }} />
                </button>
              </div>
              {form.has_queue && (
                <div>
                  <label style={labelStyle}>
                    Kết thúc Flash Sale <span style={{ color: 'rgba(255,255,255,0.25)' }}>queue.ended_at</span>
                  </label>
                  <input type="datetime-local" value={form.flash_sale_ends}
                    onChange={e => updateForm('flash_sale_ends', e.target.value)}
                    style={fieldStyle} />
                </div>
              )}
            </div>
          </div>

          {/* Right column: Section config — mirrors event_seats aggregate */}
          <div>
            <div className="p-5 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 600 }}>
                    Cấu hình khu ghế <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>event_seats</span>
                  </h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {sections.length} khu • {totalSeats.toLocaleString()} ghế tổng
                  </p>
                </div>
                <button onClick={addSection}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.2)' }}>
                  <Plus size={12} /> Thêm khu
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <div key={section.id} className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${section.color}25` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: section.color }} />
                        <span className="text-sm font-semibold" style={{ color: '#fff' }}>
                          Khu {idx + 1}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          ({section.rows * section.cols} ghế)
                        </span>
                      </div>
                      <button onClick={() => removeSection(section.id)}
                        className="p-1.5 rounded-lg hover:bg-red-900/20 transition-colors"
                        style={{ color: '#FF6B6B' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 3 }}>
                          Tên khu <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>section_name</span>
                        </label>
                        <input value={section.section_name}
                          onChange={e => updateSection(section.id, 'section_name', e.target.value)}
                          style={{ ...fieldStyle, padding: '7px 10px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 3 }}>
                          Loại giá <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>price_tier</span>
                        </label>
                        <select value={section.price_tier}
                          onChange={e => updateSection(section.id, 'price_tier', e.target.value as PriceTier)}
                          style={{ ...fieldStyle, padding: '7px 10px', cursor: 'pointer' }}>
                          {TIER_OPTIONS.map(t => (
                            <option key={t} value={t} style={{ background: '#12122A' }}>
                              {PRICE_TIER_CONFIG[t].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 3 }}>Số hàng</label>
                        <input type="number" min="1" max="20" value={section.rows}
                          onChange={e => updateSection(section.id, 'rows', Number(e.target.value))}
                          style={{ ...fieldStyle, padding: '7px 10px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 3 }}>Số cột</label>
                        <input type="number" min="1" max="30" value={section.cols}
                          onChange={e => updateSection(section.id, 'cols', Number(e.target.value))}
                          style={{ ...fieldStyle, padding: '7px 10px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 3 }}>
                          Giá (VNĐ) <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>price</span>
                        </label>
                        <input type="number" min="0" step="50000" value={section.price}
                          onChange={e => updateSection(section.id, 'price', Number(e.target.value))}
                          style={{ ...fieldStyle, padding: '7px 10px' }} />
                      </div>
                    </div>

                    {/* Color picker */}
                    <div>
                      <label style={{ ...labelStyle, marginBottom: 4 }}>Màu hiển thị</label>
                      <div className="flex gap-2">
                        {SECTION_COLORS.map(c => (
                          <button key={c} onClick={() => updateSection(section.id, 'color', c)}
                            className="w-6 h-6 rounded-full transition-transform hover:scale-125"
                            style={{
                              background: c,
                              boxShadow: section.color === c ? `0 0 0 2px #fff, 0 0 0 3px ${c}` : 'none',
                            }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  PREVIEW SƠ ĐỒ
                </div>
                <div className="flex justify-center mb-2">
                  <div className="px-8 py-1.5 rounded-full text-xs"
                    style={{ background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}>
                    SÂN KHẤU
                  </div>
                </div>
                {sections.map(section => (
                  <div key={section.id} className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-4 rounded"
                      style={{ background: section.color + '30', border: `1px solid ${section.color}50` }} />
                    <span className="text-xs w-28 text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {section.section_name} ({PRICE_TIER_CONFIG[section.price_tier].label})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
