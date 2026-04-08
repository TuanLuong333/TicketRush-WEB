import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Ticket, Users, DollarSign, Eye, Plus,
  ArrowUpRight, Calendar, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  REVENUE_SUMMARY, AUDIENCE_DEMOGRAPHICS, formatPrice
} from '../../data/mockData';
import { useApp } from '../../store/AppContext';

// Derived from va_session_audience_demographics
const ADMIN_GENDER_DATA = [
  { name: 'Nam',  value: AUDIENCE_DEMOGRAPHICS.gender_male_pct,   color: '#7c3aed' },
  { name: 'Nữ',   value: AUDIENCE_DEMOGRAPHICS.gender_female_pct, color: '#ec4899' },
  { name: 'Khác', value: AUDIENCE_DEMOGRAPHICS.gender_other_pct,  color: '#06b6d4' },
];
// Derived zone occupancy mock
const ADMIN_ZONE_OCCUPANCY = [
  { zone: 'VIP',     sold: 180, locked: 20, available: 50 },
  { zone: 'A',       sold: 280, locked: 40, available: 120 },
  { zone: 'B',       sold: 210, locked: 30, available: 160 },
  { zone: 'GENERAL', sold: 400, locked: 60, available: 300 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  flash_sale: { label: '⚡ Flash Sale', color: 'text-amber-400 bg-amber-500/10' },
  on_sale: { label: 'Đang bán', color: 'text-emerald-400 bg-emerald-500/10' },
  sold_out: { label: 'Hết vé', color: 'text-red-400 bg-red-500/10' },
  upcoming: { label: 'Sắp tới', color: 'text-blue-400 bg-blue-500/10' },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [liveTickets, setLiveTickets] = useState(6);
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, user: 'Nguyễn Văn An', action: 'Mua vé Premium × 2', event: 'BLACKPINK World Tour', time: 'Vừa xong', amount: 5000000 },
    { id: 2, user: 'Trần Thị Bình', action: 'Giữ ghế VIP × 1', event: 'Anh Trai Say Hi', time: '1 phút trước', amount: 2500000 },
    { id: 3, user: 'Lê Hoàng Nam', action: 'Mua vé Standard × 4', event: 'Vietnam EDM Fest', time: '3 phút trước', amount: 3200000 },
    { id: 4, user: 'Phạm Minh Thu', action: 'Mua vé Economy × 2', event: 'Rock Legends Night', time: '5 phút trước', amount: 800000 },
    { id: 5, user: 'Hoàng Đức Long', action: 'Mua vé Premium × 1', event: 'BLACKPINK World Tour', time: '7 phút trước', amount: 1500000 },
  ]);

  // Simulate live ticker
  useEffect(() => {
    const names = ['Minh', 'Lan', 'Hùng', 'Hoa', 'Tùng', 'Linh', 'Đạt', 'Ngọc'];
    const events = ['BLACKPINK World Tour', 'Anh Trai Say Hi', 'Vietnam EDM Fest'];
    const actions = ['Mua vé VIP × 1', 'Mua vé Premium × 2', 'Giữ ghế Standard × 3', 'Mua vé Economy × 2'];
    const amounts = [2500000, 3000000, 2400000, 800000];

    const interval = setInterval(() => {
      setLiveTickets(p => p + Math.floor(Math.random() * 3) + 1);
      const idx = Math.floor(Math.random() * names.length);
      setRecentActivity(prev => [{
        id: Date.now(),
        user: `Nguyễn ${names[idx]}`,
        action: actions[Math.floor(Math.random() * actions.length)],
        event: events[Math.floor(Math.random() * events.length)],
        time: 'Vừa xong',
        amount: amounts[Math.floor(Math.random() * amounts.length)],
      }, ...prev.slice(0, 4).map(a => ({ ...a, time: a.time === 'Vừa xong' ? '1 phút trước' : a.time }))]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { events } = useApp();
  const totalRevenue = REVENUE_SUMMARY.reduce((s, d) => s + d.total_revenue, 0);
  const totalTickets = REVENUE_SUMMARY.reduce((s, d) => s + d.total_tickets, 0);
  const ADMIN_EVENTS_TABLE = events.slice(0, 4).map(e => ({
    id: e.id,
    title: e.title,
    sold: e.sold_seats,
    total: e.total_seats,
    status: e.has_queue ? 'flash_sale' : e.status === 'on_sale' ? 'on_sale' : e.status,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white" style={{ fontWeight: 800, fontSize: '1.5rem' }}>Dashboard</h1>
          <p className="text-slate-400 text-sm">Tổng quan hoạt động — Cập nhật theo thời gian thực</p>
        </div>
        <button
          onClick={() => navigate('/admin/events/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm transition-all shadow-lg shadow-violet-500/20"
          style={{ fontWeight: 700 }}
        >
          <Plus className="w-4 h-4" />
          Tạo sự kiện
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<DollarSign className="w-5 h-5" />}
          label="Doanh thu"
          value={formatPrice(totalRevenue)}
          change="+18.2%"
          positive
          color="violet"
        />
        <KPICard
          icon={<Ticket className="w-5 h-5" />}
          label="Vé đã bán (tuần)"
          value={totalTickets.toLocaleString('vi-VN')}
          change="+24.5%"
          positive
          color="cyan"
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Vé hôm nay"
          value={liveTickets.toString()}
          change="Trực tiếp"
          positive
          color="emerald"
          live
        />
        <KPICard
          icon={<Calendar className="w-5 h-5" />}
          label="Sự kiện đang chạy"
          value="4"
          change="2 flash sale"
          positive
          color="amber"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart - takes 2 cols */}
        <div className="lg:col-span-2 bg-[#14141f] rounded-2xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white" style={{ fontWeight: 700 }}>Doanh thu 7 ngày qua</h2>
              <p className="text-slate-500 text-xs">Tổng: {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(totalRevenue)}đ</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20" style={{ fontWeight: 600 }}>
              <ArrowUpRight className="w-3.5 h-3.5" />
              +18.2%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_SUMMARY}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                formatter={(v: number) => [formatPrice(v), 'Doanh thu']}
              />
              <Area type="monotone" dataKey="total_revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: '#7c3aed', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gender pie */}
        <div className="bg-[#14141f] rounded-2xl border border-white/10 p-5">
          <h2 className="text-white mb-4" style={{ fontWeight: 700 }}>Giới tính khán giả</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={ADMIN_GENDER_DATA} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {ADMIN_GENDER_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                formatter={(v: number) => [`${v}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5">
            {ADMIN_GENDER_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="text-white" style={{ fontWeight: 600 }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Seat occupancy */}
        <div className="bg-[#14141f] rounded-2xl border border-white/10 p-5">
          <h2 className="text-white mb-4" style={{ fontWeight: 700 }}>Lấp đầy ghế theo khu vực</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ADMIN_ZONE_OCCUPANCY} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="zone" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="sold" stackId="a" fill="#7c3aed" radius={[0, 0, 0, 0]} name="Đã bán" />
              <Bar dataKey="locked" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Đang giữ" />
              <Bar dataKey="available" stackId="a" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} name="Còn trống" />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Age groups */}
        <div className="bg-[#14141f] rounded-2xl border border-white/10 p-5">
          <h2 className="text-white mb-4" style={{ fontWeight: 700 }}>Phân bố độ tuổi</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={AUDIENCE_DEMOGRAPHICS.age_groups} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                formatter={(v: number) => [v.toLocaleString('vi-VN'), 'Khán giả']} />
              <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Khán giả" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="bg-[#14141f] rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-white" style={{ fontWeight: 700 }}>Hoạt động gần đây</h2>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 text-sm" style={{ fontWeight: 700, color: '#a78bfa' }}>
                  {activity.user.split(' ').pop()?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm" style={{ fontWeight: 600 }}>{activity.user}</p>
                  <p className="text-slate-500 text-xs truncate">{activity.action} · {activity.event}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-violet-400 text-xs" style={{ fontWeight: 700 }}>
                    +{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(activity.amount)}đ
                  </p>
                  <p className="text-slate-600 text-[10px]">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event status */}
        <div className="bg-[#14141f] rounded-2xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white" style={{ fontWeight: 700 }}>Sự kiện đang hoạt động</h2>
            <button onClick={() => navigate('/admin/events')} className="text-violet-400 text-xs hover:text-violet-300 transition-all" style={{ fontWeight: 600 }}>
              Xem tất cả →
            </button>
          </div>
          <div className="space-y-2.5">
            {ADMIN_EVENTS_TABLE.slice(0, 4).map(event => {
              const pct = Math.round((event.sold / event.total) * 100);
              const s = STATUS_CONFIG[event.status];
              return (
                <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white text-xs truncate" style={{ fontWeight: 600 }}>{event.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${s.color}`} style={{ fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                      <span>{event.sold.toLocaleString('vi-VN')} / {event.total.toLocaleString('vi-VN')} ghế</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, change, positive, color, live }: {
  icon: React.ReactNode; label: string; value: string;
  change: string; positive: boolean; color: string; live?: boolean;
}) {
  const colors: Record<string, { bg: string; text: string }> = {
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  };
  const c = colors[color];
  return (
    <div className="bg-[#14141f] rounded-2xl border border-white/10 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.text}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`} style={{ fontWeight: 600 }}>
          {live && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-0.5" />}
          {change}
        </div>
      </div>
      <p className="text-white mb-0.5" style={{ fontWeight: 800, fontSize: '1.4rem' }}>{value}</p>
      <p className="text-slate-500 text-xs">{label}</p>
    </div>
  );
}
