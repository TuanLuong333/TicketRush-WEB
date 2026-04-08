import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Plus, Trash2, Eye, Save,
  Calendar, Clock, MapPin, Image, Tag, AlertCircle, CheckCircle2
} from 'lucide-react';

interface ZoneConfig {
  id: string;
  name: string;
  label: string;
  rows: number;
  cols: number;
  price: number;
  color: string;
}

const ZONE_COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899', '#f97316'];

const DEFAULT_ZONES: ZoneConfig[] = [
  { id: 'vip', name: 'VIP', label: 'Khu VIP', rows: 4, cols: 12, price: 2500000, color: '#f59e0b' },
  { id: 'premium', name: 'Premium', label: 'Khu Premium', rows: 6, cols: 16, price: 1500000, color: '#8b5cf6' },
  { id: 'standard', name: 'Standard', label: 'Khu Standard', rows: 8, cols: 20, price: 800000, color: '#06b6d4' },
  { id: 'economy', name: 'Economy', label: 'Khu Economy', rows: 6, cols: 24, price: 400000, color: '#22c55e' },
];

export function CreateEventPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [zones, setZones] = useState<ZoneConfig[]>(DEFAULT_ZONES);
  const [form, setForm] = useState({
    title: '',
    artist: '',
    date: '',
    time: '19:30',
    venue: '',
    location: '',
    category: 'Âm nhạc',
    description: '',
    image: '',
    maxPerOrder: '8',
  });

  const updateForm = (key: keyof typeof form, val: string) => setForm(p => ({ ...p, [key]: val }));

  const addZone = () => {
    const id = `zone-${Date.now()}`;
    setZones(prev => [...prev, {
      id, name: 'New Zone', label: 'Khu mới', rows: 5, cols: 10,
      price: 500000, color: ZONE_COLORS[prev.length % ZONE_COLORS.length],
    }]);
  };

  const updateZone = (id: string, key: keyof ZoneConfig, val: string | number) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [key]: val } : z));
  };

  const removeZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
  };

  const totalSeats = zones.reduce((sum, z) => sum + z.rows * z.cols, 0);

  const handleSave = async () => {
    setSaved(true);
    await new Promise(res => setTimeout(res, 1500));
    navigate('/admin/events');
  };

  const isStep1Valid = form.title && form.artist && form.date && form.venue && form.location;

  if (saved) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-white text-xl mb-2" style={{ fontWeight: 800 }}>Sự kiện đã được tạo!</h2>
          <p className="text-slate-400 mb-6">Sự kiện của bạn sẽ được hiển thị sau khi duyệt.</p>
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/events')}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-white" style={{ fontWeight: 800, fontSize: '1.5rem' }}>Tạo sự kiện mới</h1>
          <p className="text-slate-400 text-sm">Điền thông tin sự kiện và cấu hình sơ đồ ghế</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => s < step || isStep1Valid ? setStep(s) : null}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                step === s ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' :
                s < step ? 'bg-violet-500/20 text-violet-300 border border-violet-500/20' :
                'bg-white/5 text-slate-500 border border-white/10'
              }`}
              style={{ fontWeight: step === s ? 700 : 400 }}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === s ? 'bg-white/20' : ''}`} style={{ fontWeight: 700 }}>
                {s}
              </span>
              <span className="hidden sm:block">
                {s === 1 ? 'Thông tin' : s === 2 ? 'Sơ đồ ghế' : 'Xem trước'}
              </span>
            </button>
            {s < 3 && <div className="w-6 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: Event info */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-[#14141f] rounded-2xl border border-white/10 p-6">
            <h2 className="text-white mb-4" style={{ fontWeight: 700 }}>Thông tin cơ bản</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Tên sự kiện *" value={form.title} onChange={v => updateForm('title', v)} placeholder="VD: BLACKPINK World Tour 2026" span2 />
              <FormField label="Nghệ sĩ/Diễn giả *" value={form.artist} onChange={v => updateForm('artist', v)} placeholder="VD: BLACKPINK" />
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Thể loại</label>
                <select
                  value={form.category}
                  onChange={e => updateForm('category', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                >
                  {['Âm nhạc', 'Hài kịch', 'Thể thao', 'Khác'].map(c => (
                    <option key={c} value={c} className="bg-[#1a1a2e]">{c}</option>
                  ))}
                </select>
              </div>
              <FormField label="Ngày diễn ra *" value={form.date} onChange={v => updateForm('date', v)} type="date" />
              <FormField label="Giờ bắt đầu *" value={form.time} onChange={v => updateForm('time', v)} type="time" />
              <FormField label="Địa điểm *" value={form.venue} onChange={v => updateForm('venue', v)} placeholder="VD: Sân vận động Mỹ Đình" />
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Thành phố *</label>
                <select
                  value={form.location}
                  onChange={e => updateForm('location', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                >
                  <option value="" className="bg-[#1a1a2e]">Chọn thành phố</option>
                  {['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'].map(c => (
                    <option key={c} value={c} className="bg-[#1a1a2e]">{c}</option>
                  ))}
                </select>
              </div>
              <FormField label="Vé tối đa/đơn" value={form.maxPerOrder} onChange={v => updateForm('maxPerOrder', v)} type="number" />
            </div>

            <div className="mt-4">
              <label className="block text-slate-400 text-xs mb-1.5">Mô tả sự kiện</label>
              <textarea
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                rows={3}
                placeholder="Mô tả chi tiết về sự kiện..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all resize-none"
              />
            </div>

            <div className="mt-4">
              <label className="block text-slate-400 text-xs mb-1.5">URL hình ảnh banner</label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={form.image}
                  onChange={e => updateForm('image', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                />
                {form.image && (
                  <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={form.image} alt="" className="w-full h-full object-cover" onError={() => {}} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => isStep1Valid && setStep(2)}
              disabled={!isStep1Valid}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
              style={{ fontWeight: 700 }}
            >
              Tiếp tục → Cấu hình ghế
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Seat map config */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-[#14141f] rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-white" style={{ fontWeight: 700 }}>Cấu hình sơ đồ ghế</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Tổng: <span className="text-white" style={{ fontWeight: 600 }}>{totalSeats.toLocaleString('vi-VN')}</span> ghế
                </p>
              </div>
              <button
                onClick={addZone}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm hover:bg-violet-600/30 transition-all"
                style={{ fontWeight: 600 }}
              >
                <Plus className="w-4 h-4" />
                Thêm khu vực
              </button>
            </div>

            <div className="space-y-4">
              {zones.map((zone, idx) => (
                <div key={zone.id} className="p-4 rounded-xl bg-white/5 border border-white/10 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={zone.color}
                        onChange={e => updateZone(zone.id, 'color', e.target.value)}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-slate-400 text-xs">Màu</span>
                    </div>
                    <input
                      type="text"
                      value={zone.name}
                      onChange={e => updateZone(zone.id, 'name', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                      placeholder="Tên khu"
                    />
                    <input
                      type="text"
                      value={zone.label}
                      onChange={e => updateZone(zone.id, 'label', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                      placeholder="Nhãn hiển thị"
                    />
                    <button
                      onClick={() => removeZone(zone.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">Số hàng</label>
                      <input
                        type="number" min="1" max="30"
                        value={zone.rows}
                        onChange={e => updateZone(zone.id, 'rows', +e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">Ghế/hàng</label>
                      <input
                        type="number" min="1" max="50"
                        value={zone.cols}
                        onChange={e => updateZone(zone.id, 'cols', +e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">Giá/vé (VNĐ)</label>
                      <input
                        type="number" min="0" step="50000"
                        value={zone.price}
                        onChange={e => updateZone(zone.id, 'price', +e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                    <span>
                      {zone.rows} hàng × {zone.cols} ghế = <span className="text-white" style={{ fontWeight: 600 }}>{zone.rows * zone.cols} ghế</span>
                    </span>
                    <span>
                      Giá: <span style={{ color: zone.color, fontWeight: 600 }}>
                        {new Intl.NumberFormat('vi-VN').format(zone.price)}đ
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview mini seat map */}
          <div className="bg-[#14141f] rounded-2xl border border-white/10 p-5">
            <h3 className="text-white mb-4 text-sm" style={{ fontWeight: 700 }}>Xem trước sơ đồ ghế</h3>
            <div className="space-y-3">
              {/* Stage */}
              <div className="h-8 bg-white/10 rounded-t-full mx-auto max-w-xs flex items-center justify-center">
                <span className="text-white/60 text-xs" style={{ fontWeight: 600 }}>SÂN KHẤU</span>
              </div>
              {zones.map(zone => (
                <div key={zone.id} className="text-center">
                  <div className="text-xs mb-1" style={{ color: zone.color, fontWeight: 600 }}>{zone.label}</div>
                  <div className="flex justify-center gap-0.5 flex-wrap">
                    {Array.from({ length: Math.min(zone.rows * zone.cols, 120) }, (_, i) => (
                      <div key={i} className="w-2 h-2 rounded-sm" style={{ backgroundColor: zone.color + 'aa' }} />
                    ))}
                    {zone.rows * zone.cols > 120 && <span className="text-slate-600 text-[10px] self-center ml-1">+{zone.rows * zone.cols - 120}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm"
              style={{ fontWeight: 600 }}
            >
              ← Quay lại
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20"
              style={{ fontWeight: 700 }}
            >
              Xem trước & Lưu →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & save */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-[#14141f] rounded-2xl border border-white/10 p-6">
            <h2 className="text-white mb-5" style={{ fontWeight: 700 }}>Xem trước sự kiện</h2>

            <div className="flex flex-col sm:flex-row gap-5">
              {form.image && (
                <div className="w-full sm:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h3 className="text-white" style={{ fontWeight: 800, fontSize: '1.2rem' }}>{form.title || '(Chưa đặt tên)'}</h3>
                <p className="text-violet-400 text-sm mt-0.5" style={{ fontWeight: 600 }}>{form.artist}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                  {form.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{form.date} · {form.time}</span>}
                  {form.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{form.venue}, {form.location}</span>}
                  {form.category && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{form.category}</span>}
                </div>
                {form.description && <p className="text-slate-500 text-xs mt-2 line-clamp-2">{form.description}</p>}
              </div>
            </div>
          </div>

          <div className="bg-[#14141f] rounded-2xl border border-white/10 p-6">
            <h2 className="text-white mb-4" style={{ fontWeight: 700 }}>Tóm tắt sơ đồ ghế</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                    <span className="text-white text-sm" style={{ fontWeight: 600 }}>{zone.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm" style={{ fontWeight: 600 }}>{zone.rows * zone.cols} ghế</p>
                    <p className="text-slate-400 text-xs">{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(zone.price)}đ</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-between text-sm">
              <span className="text-violet-300" style={{ fontWeight: 600 }}>Tổng số ghế</span>
              <span className="text-white" style={{ fontWeight: 800 }}>{totalSeats.toLocaleString('vi-VN')} ghế</span>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm"
              style={{ fontWeight: 600 }}
            >
              ← Quay lại
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white transition-all shadow-lg shadow-emerald-500/20"
              style={{ fontWeight: 700 }}
            >
              <Save className="w-4 h-4" />
              Lưu & Xuất bản sự kiện
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', span2 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; span2?: boolean;
}) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="block text-slate-400 text-xs mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
      />
    </div>
  );
}
