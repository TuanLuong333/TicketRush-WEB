import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Search, Eye, Edit3, Trash2, BarChart3,
  Calendar, MapPin, ChevronUp, ChevronDown, Users
} from 'lucide-react';
import { ADMIN_EVENTS_TABLE, formatCurrency } from '../../data/mockData';

type SortKey = 'title' | 'date' | 'sold' | 'revenue';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  flash_sale: { label: '⚡ Flash Sale', class: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  on_sale: { label: '● Đang bán', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  sold_out: { label: '✕ Hết vé', class: 'text-red-400 bg-red-500/10 border-red-500/20' },
  upcoming: { label: '◷ Sắp tới', class: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

export function EventsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = ADMIN_EVENTS_TABLE
    .filter(e => {
      const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'title') return mult * a.title.localeCompare(b.title);
      if (sortKey === 'date') return mult * a.date.localeCompare(b.date);
      if (sortKey === 'sold') return mult * (a.sold - b.sold);
      return mult * (a.revenue - b.revenue);
    });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalRevenue = filtered.reduce((s, e) => s + e.revenue, 0);
  const totalSold = filtered.reduce((s, e) => s + e.sold, 0);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white" style={{ fontWeight: 800, fontSize: '1.5rem' }}>Quản lý sự kiện</h1>
          <p className="text-slate-400 text-sm">{filtered.length} sự kiện</p>
        </div>
        <button
          onClick={() => navigate('/admin/events/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm transition-all shadow-lg shadow-violet-500/20"
          style={{ fontWeight: 700 }}
        >
          <Plus className="w-4 h-4" />
          Tạo sự kiện mới
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Tổng sự kiện" value={ADMIN_EVENTS_TABLE.length} unit="sự kiện" />
        <SummaryCard label="Đang bán" value={ADMIN_EVENTS_TABLE.filter(e => e.status === 'on_sale' || e.status === 'flash_sale').length} unit="sự kiện" color="text-emerald-400" />
        <SummaryCard label="Vé đã bán" value={totalSold.toLocaleString('vi-VN')} unit="vé" color="text-violet-400" />
        <SummaryCard label="Doanh thu" value={new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(totalRevenue) + 'đ'} unit="" color="text-amber-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'flash_sale', 'on_sale', 'upcoming', 'sold_out'].map(s => {
            const label = s === 'all' ? 'Tất cả' : STATUS_CONFIG[s]?.label || s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs transition-all border ${
                  statusFilter === s
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                style={{ fontWeight: statusFilter === s ? 600 : 400 }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <span className="text-violet-300 text-sm" style={{ fontWeight: 600 }}>
            Đã chọn {selected.size} sự kiện
          </span>
          <button className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-all border border-red-500/20" style={{ fontWeight: 600 }}>
            Xoá
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 text-xs hover:text-slate-300 transition-all">
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#14141f] rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-violet-600"
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(f => f.id)) : new Set())}
                    checked={selected.size === filtered.length && filtered.length > 0}
                  />
                </th>
                <SortHeader label="Sự kiện" sortKey="title" current={sortKey} dir={sortDir} onClick={() => handleSort('title')} />
                <th className="p-4 text-left text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">Địa điểm</th>
                <SortHeader label="Ngày" sortKey="date" current={sortKey} dir={sortDir} onClick={() => handleSort('date')} />
                <SortHeader label="Vé bán" sortKey="sold" current={sortKey} dir={sortDir} onClick={() => handleSort('sold')} />
                <SortHeader label="Doanh thu" sortKey="revenue" current={sortKey} dir={sortDir} onClick={() => handleSort('revenue')} />
                <th className="p-4 text-left text-slate-500 text-xs uppercase tracking-wider">Trạng thái</th>
                <th className="p-4 text-left text-slate-500 text-xs uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(event => {
                const pct = Math.round((event.sold / event.total) * 100);
                const s = STATUS_CONFIG[event.status];
                return (
                  <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-all">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-violet-600"
                        checked={selected.has(event.id)}
                        onChange={() => toggleSelect(event.id)}
                      />
                    </td>
                    <td className="p-4">
                      <p className="text-white text-sm line-clamp-1" style={{ fontWeight: 600 }}>{event.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1 w-24 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-slate-500 text-[10px]">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{event.venue}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 text-sm whitespace-nowrap">{event.date}</td>
                    <td className="p-4">
                      <p className="text-white text-sm" style={{ fontWeight: 600 }}>
                        {event.sold.toLocaleString('vi-VN')}
                      </p>
                      <p className="text-slate-500 text-[10px]">/ {event.total.toLocaleString('vi-VN')}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-violet-400 text-sm whitespace-nowrap" style={{ fontWeight: 700 }}>
                        {event.revenue > 0
                          ? new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(event.revenue) + 'đ'
                          : '—'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full border ${s.class}`} style={{ fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <ActionBtn icon={<Eye className="w-3.5 h-3.5" />} onClick={() => navigate(`/events/${event.id}`)} tooltip="Xem" />
                        <ActionBtn icon={<Edit3 className="w-3.5 h-3.5" />} onClick={() => {}} tooltip="Sửa" />
                        <ActionBtn icon={<BarChart3 className="w-3.5 h-3.5" />} onClick={() => navigate('/admin/dashboard')} tooltip="Thống kê" />
                        <ActionBtn icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => {}} tooltip="Xoá" danger />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>Không tìm thấy sự kiện nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick }: { label: string; sortKey: string; current: string; dir: string; onClick: () => void }) {
  const active = current === sortKey;
  return (
    <th className="p-4 text-left cursor-pointer hover:text-slate-300 transition-all" onClick={onClick}>
      <div className="flex items-center gap-1 text-slate-500 text-xs uppercase tracking-wider">
        {label}
        {active ? (dir === 'asc' ? <ChevronUp className="w-3 h-3 text-violet-400" /> : <ChevronDown className="w-3 h-3 text-violet-400" />) : null}
      </div>
    </th>
  );
}

function ActionBtn({ icon, onClick, tooltip, danger }: { icon: React.ReactNode; onClick: () => void; tooltip: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      {icon}
    </button>
  );
}

function SummaryCard({ label, value, unit, color = 'text-white' }: { label: string; value: string | number; unit: string; color?: string }) {
  return (
    <div className="bg-[#14141f] rounded-xl border border-white/10 p-4">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className={`${color}`} style={{ fontWeight: 800, fontSize: '1.2rem' }}>{value}</p>
      {unit && <p className="text-slate-600 text-[10px]">{unit}</p>}
    </div>
  );
}
