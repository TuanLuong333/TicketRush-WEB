import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Ticket, DollarSign, Users, RefreshCw, Activity, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { REVENUE_SUMMARY, AUDIENCE_DEMOGRAPHICS, RECENT_ORDERS, formatPrice } from '../../data/mockData';

const GENDER_DATA = [
  { name: 'Nam',  value: AUDIENCE_DEMOGRAPHICS.gender_male_pct,   color: '#3B82F6' },
  { name: 'Nữ',   value: AUDIENCE_DEMOGRAPHICS.gender_female_pct, color: '#EC4899' },
  { name: 'Khác', value: AUDIENCE_DEMOGRAPHICS.gender_other_pct,  color: '#8B5CF6' },
];

export default function AdminDashboardPage() {
  const { events, orders } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalRevenue  = REVENUE_SUMMARY.reduce((s, d) => s + d.total_revenue, 0);
  const totalTickets  = REVENUE_SUMMARY.reduce((s, d) => s + d.total_tickets, 0);
  const totalEvents   = events.length;
  const totalAttendees = events.reduce((s, e) => s + e.sold_seats, 0);

  const stats = [
    { icon: DollarSign, label: 'Tổng doanh thu', value: formatPrice(totalRevenue), change: '+12.5%', color: '#10B981' },
    { icon: Ticket,     label: 'Vé đã bán',       value: totalTickets.toLocaleString(), change: '+8.3%',  color: '#3B82F6' },
    { icon: Activity,   label: 'Sự kiện',          value: totalEvents,                   change: '+2',      color: '#8B5CF6' },
    { icon: Users,      label: 'Khán giả',         value: totalAttendees.toLocaleString(), change: '+15.7%', color: '#F59E0B' },
  ];

  // Occupancy data per event (mirrors va_session_revenue_summary joining events)
  const occupancyData = events.slice(0, 5).map(e => ({
    name: e.title.split(' ').slice(0, 2).join(' '),
    percent: Math.round((e.sold_seats / e.total_seats) * 100),
    sold: e.sold_seats,
    total: e.total_seats,
  }));

  const customTooltipStyle = {
    background: '#1E1E3A',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
  };

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem' }}>Dashboard</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Tổng quan nền tảng TicketRush
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
            <span className="text-xs" style={{ color: '#10B981' }}>Live</span>
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {now.toLocaleTimeString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, label, value, change, color }) => (
            <div key={label} className="p-5 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: color + '20' }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: '#10B981' }}>
                  <ArrowUpRight size={12} /> {change}
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color: '#fff' }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Revenue Chart — from va_session_revenue_summary */}
          <div className="xl:col-span-2 p-5 rounded-2xl"
            style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ color: '#fff', fontWeight: 600 }}>Doanh thu theo tháng</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  6 tháng gần nhất (VNĐ) — va_session_revenue_summary
                </p>
              </div>
              <button className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw size={14} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={REVENUE_SUMMARY}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                  tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(v: number) => [formatPrice(v), 'Doanh thu']}
                />
                <Area type="monotone" dataKey="total_revenue" stroke="#FF6B35" strokeWidth={2}
                  fill="url(#revenueGrad)" dot={{ fill: '#FF6B35', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gender Pie — from va_session_audience_demographics */}
          <div className="p-5 rounded-2xl"
            style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="mb-1" style={{ color: '#fff', fontWeight: 600 }}>Giới tính khán giả</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              va_session_audience_demographics
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={GENDER_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  paddingAngle={4} dataKey="value">
                  {GENDER_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {GENDER_DATA.map(g => (
                <div key={g.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{g.name}</span>
                  </div>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{g.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Age Distribution — from va_session_audience_demographics.age_groups */}
          <div className="xl:col-span-2 p-5 rounded-2xl"
            style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="mb-1" style={{ color: '#fff', fontWeight: 600 }}>Phân bố độ tuổi</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              va_session_audience_demographics.age_groups
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={AUDIENCE_DEMOGRAPHICS.age_groups}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="range" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                <Tooltip contentStyle={customTooltipStyle} formatter={(v: number) => [v + ' người', 'Số lượng']} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Seat Occupancy per Event */}
          <div className="p-5 rounded-2xl"
            style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="mb-1" style={{ color: '#fff', fontWeight: 600 }}>Lấp đầy ghế</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Tỷ lệ bán vé theo sự kiện</p>
            <div className="space-y-3">
              {occupancyData.map(item => (
                <div key={item.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 120 }}>{item.name}</span>
                    <span className="text-xs font-bold" style={{ color: item.percent >= 80 ? '#FF6B6B' : '#10B981' }}>
                      {item.percent}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percent}%`,
                        background: item.percent >= 80
                          ? 'linear-gradient(90deg, #FF6B35, #EF4444)'
                          : 'linear-gradient(90deg, #3B82F6, #10B981)',
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders — from orders table */}
        <div className="p-5 rounded-2xl"
          style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: '#fff', fontWeight: 600 }}>Giao dịch gần đây</h3>
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />
              Cập nhật real-time
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Mã đơn', 'Khách hàng', 'Sự kiện', 'Số vé', 'Số tiền', 'Thời gian'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 text-xs font-semibold"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_ORDERS.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-2.5 pr-4">
                      <span className="font-mono text-xs" style={{ color: '#FF6B35' }}>{o.id}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs" style={{ color: '#fff' }}>{o.user}</td>
                    <td className="py-2.5 pr-4 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{o.event}</td>
                    <td className="py-2.5 pr-4 text-xs text-center" style={{ color: '#fff' }}>{o.tickets}</td>
                    <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: '#10B981' }}>
                      {formatPrice(o.amount)}
                    </td>
                    <td className="py-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{o.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
