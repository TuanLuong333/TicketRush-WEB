import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router';
import { Activity, Database, DollarSign, LockKeyhole, Ticket, Users } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { usePreferences } from '../../store/PreferencesContext';
import { formatPrice, USERS } from '../../data/mockData';
import { getOrderStatusLabel } from '../../data/types';
import type { AudienceStatistics, Order } from '../../data/types';
import { apiClient } from '../../api/client';
import AdminOrderDetailModal, { getOrderStatusTone, getVisibleOrderStatus } from './AdminOrderDetailModal';

interface DashboardData {
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  soldSeats: number;
  occupancyRate: number;
  revenue: number;
}

export default function AdminDashboardPage() {
  const {
    events,
    orders,
    orderItems,
    queueEntries,
    seatLockLogs,
    getStats,
    apiReady,
    user,
    adminOrdersAvailable,
    refreshAdminOrders,
  } = useApp();
  const { language, t } = usePreferences();
  const [dashboardMap, setDashboardMap] = useState<Record<number, DashboardData>>({});
  const [audienceStats, setAudienceStats] = useState<AudienceStatistics>({ gender: [], age: [] });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadDashboards = useCallback(async () => {
    if (!apiReady || events.length === 0) return;
    try {
      const results = await Promise.allSettled(
        events.map(event => apiClient.getDashboard(event.id))
      );
      const map: Record<number, DashboardData> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          map[events[index].id] = result.value;
        }
      });
      setDashboardMap(map);
    } catch {
      setDashboardMap({});
    }
  }, [apiReady, events]);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  const loadAudienceStats = useCallback(async () => {
    if (!apiReady || events.length === 0) return;

    const results = await Promise.allSettled(
      events.map(event => apiClient.getAudienceStatistics(event.id))
    );
    const gender = new Map<string, number>();
    const age = new Map<string, number>();

    results.forEach(result => {
      if (result.status !== 'fulfilled') return;
      result.value.gender.forEach(point => {
        gender.set(point.gender, (gender.get(point.gender) ?? 0) + point.total);
      });
      result.value.age.forEach(point => {
        age.set(point.ageGroup, (age.get(point.ageGroup) ?? 0) + point.total);
      });
    });

    setAudienceStats({
      gender: Array.from(gender, ([genderKey, total]) => ({ gender: genderKey, total })),
      age: Array.from(age, ([ageGroup, total]) => ({ ageGroup, total })),
    });
  }, [apiReady, events]);

  useEffect(() => {
    void loadAudienceStats();
  }, [loadAudienceStats]);

  useEffect(() => {
    if (apiReady && user?.role === 'admin') {
      void refreshAdminOrders();
    }
  }, [apiReady, refreshAdminOrders, user?.role]);

  const totalRevenue = apiReady
    ? Object.values(dashboardMap).reduce((sum, d) => sum + (d.revenue || 0), 0)
    : orders.filter(order => order.status === 'paid').reduce((sum, order) => sum + order.total_amount, 0);

  const soldTickets = apiReady
    ? Object.values(dashboardMap).reduce((sum, d) => sum + (d.soldSeats || 0), 0)
    : orderItems.length;

  const activeQueue = queueEntries.filter(entry => entry.status === 'waiting' || entry.status === 'active').length;
  const lockedCount = apiReady
    ? Object.values(dashboardMap).reduce((sum, d) => sum + (d.lockedSeats || 0), 0)
    : seatLockLogs.filter(log => log.action === 'lock').length;

  const eventOccupancy = useMemo(() => {
    const data = events.map(event => {
      const dash = dashboardMap[event.id];
      const name = event.title.split(' ').slice(0, 2).join(' ');
      const shortName = name.length > 15 ? name.substring(0, 15) + '...' : name;
      
      if (dash) {
        return {
          name: shortName,
          sold: dash.soldSeats,
          available: dash.availableSeats,
          occupancy: dash.occupancyRate,
        };
      }
      const stats = getStats(event.id);
      return {
        name: shortName,
        sold: stats.sold,
        available: stats.available,
        occupancy: stats.occupancy_pct,
      };
    });
    return data.sort((a, b) => b.occupancy - a.occupancy).slice(0, 6);
  }, [dashboardMap, events, getStats]);

  const revenueByEvent = useMemo(() => {
    const data = events.map(event => {
      const dash = dashboardMap[event.id];
      const label = event.title.split(' ').slice(0, 2).join(' ');
      const shortLabel = label.length > 15 ? label.substring(0, 15) + '...' : label;
      
      return {
        label: shortLabel,
        revenue: dash?.revenue || 0,
        tickets: dash?.soldSeats || 0,
      };
    });
    return data.sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [dashboardMap, events]);

  const localAudienceStats = useMemo(() => {
    const paidUserIds = new Set(orders.filter(order => order.status === 'paid').map(order => order.user_id));
    const paidUsers = USERS.filter(user => paidUserIds.has(user.id));
    const gender = new Map<string, number>();
    const age = new Map<string, number>();

    paidUsers.forEach(user => {
      gender.set(user.gender, (gender.get(user.gender) ?? 0) + 1);
      const ageValue = user.dob ? Math.floor((Date.now() - new Date(user.dob).getTime()) / 31557600000) : Number.NaN;
      const group = Number.isFinite(ageValue)
        ? ageValue < 18
          ? '<18'
          : ageValue <= 24
            ? '18-24'
            : ageValue <= 34
              ? '25-34'
              : ageValue <= 44
                ? '35-44'
                : '45+'
        : 'UNKNOWN';
      age.set(group, (age.get(group) ?? 0) + 1);
    });

    return {
      gender: Array.from(gender, ([genderKey, total]) => ({ gender: genderKey, total })),
      age: Array.from(age, ([ageGroup, total]) => ({ ageGroup, total })),
    };
  }, [orders]);

  const genderLabel = useCallback((gender: string) => {
    const normalized = gender.toLowerCase();
    if (language === 'en') {
      if (normalized === 'male') return 'Male';
      if (normalized === 'female') return 'Female';
      if (normalized === 'other') return 'Other';
      return 'Unknown';
    }
    if (normalized === 'male') return 'Nam';
    if (normalized === 'female') return 'Nữ';
    if (normalized === 'other') return 'Khác';
    return 'Không rõ';
  }, [language]);

  const audienceByGender = (apiReady && audienceStats.gender.length > 0 ? audienceStats.gender : localAudienceStats.gender)
    .map(point => ({ label: genderLabel(point.gender), total: point.total }));
  const audienceByAge = (apiReady && audienceStats.age.length > 0 ? audienceStats.age : localAudienceStats.age)
    .map(point => ({ label: point.ageGroup === 'UNKNOWN' ? (language === 'en' ? 'Unknown' : 'Không rõ') : point.ageGroup, total: point.total }));

  const recentOrders = orders
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)
    .map(order => {
      const event = events.find(item => item.id === order.event_id);
      const visibleStatus = getVisibleOrderStatus(order);
      const loadedItemCount = orderItems.filter(item => item.order_id === order.id).length;
      return {
        order,
        code: order.order_code,
        event: event?.title ?? (language === 'en' ? 'Event' : 'Sự kiện'),
        amount: order.total_amount,
        status: visibleStatus,
        items: loadedItemCount || order.item_count || 0,
        time: new Date(order.created_at).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
    });

  const stats = [
    { label: language === 'en' ? 'Total Revenue' : 'Doanh thu', value: formatPrice(totalRevenue), icon: DollarSign, color: '#16A34A' },
    { label: language === 'en' ? 'Tickets Sold' : 'Vé đã bán', value: soldTickets.toLocaleString(), icon: Ticket, color: '#F97316' },
    { label: language === 'en' ? 'Active Queues' : 'Hàng chờ hoạt động', value: activeQueue.toLocaleString(), icon: Users, color: '#0EA5E9' },
    { label: language === 'en' ? 'Held Seats' : 'Đang giữ ghế', value: lockedCount.toLocaleString(), icon: LockKeyhole, color: '#7C3AED' },
  ];

  const tooltipStyle = {
    background: '#0F172A',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-black uppercase text-orange-500">{t('admin')}</p>
            <h1 className="text-2xl font-black">{t('dashboard')}</h1>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md" style={{ background: `${color}20`, color }}>
                <Icon size={21} />
              </div>
              <div className="text-2xl font-black">{value}</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-black">{language === 'en' ? 'Top revenue by event' : 'Top doanh thu theo sự kiện'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {apiReady
                    ? (language === 'en' ? 'Top 8 events with highest recorded revenue' : 'Top 8 sự kiện có doanh thu cao nhất')
                    : (language === 'en' ? 'Top 8 events calculated from paid order totals' : 'Top 8 sự kiện tính từ tổng tiền các đơn')}
                </p>
              </div>
              <Database size={20} style={{ color: '#F97316' }} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueByEvent}>
                <defs>
                  <linearGradient id="adminRevenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" className="opacity-50 dark:opacity-20" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 12, fill: 'currentColor' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12, fill: 'currentColor' }} tickFormatter={value => `${Number(value) / 1000000}M`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatPrice(value), language === 'en' ? 'Revenue' : 'Doanh thu']} />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} fill="url(#adminRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-black">{language === 'en' ? 'Top event occupancy' : 'Top lấp đầy sự kiện'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {apiReady
                    ? (language === 'en' ? 'Top 6 events with highest sold seats ratio' : 'Top 6 sự kiện có tỷ lệ lấp đầy cao nhất')
                    : (language === 'en' ? 'Top 6 events calculated from current seat states' : 'Top 6 sự kiện tính từ trạng thái ghế')}
                </p>
              </div>
              <Activity size={20} style={{ color: '#0EA5E9' }} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={eventOccupancy}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" className="opacity-50 dark:opacity-20" />
                <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 11, fill: 'currentColor' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12, fill: 'currentColor' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, language === 'en' ? 'Occupancy' : 'Lấp đầy']} />
                <Bar dataKey="occupancy" fill="#0EA5E9" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-black">{language === 'en' ? 'Audience by gender' : 'Khán giả theo giới tính'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'en' ? 'Unique customers with paid orders' : 'Khách hàng đã thanh toán, không tính trùng'}</p>
              </div>
              <Users size={20} style={{ color: '#7C3AED' }} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={audienceByGender}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" className="opacity-50 dark:opacity-20" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 12, fill: 'currentColor' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12, fill: 'currentColor' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, language === 'en' ? 'Audience' : 'Khán giả']} />
                <Bar dataKey="total" fill="#7C3AED" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-black">{language === 'en' ? 'Audience by age' : 'Khán giả theo độ tuổi'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'en' ? 'Age groups based on buyer date of birth' : 'Nhóm tuổi dựa trên ngày sinh của người mua'}</p>
              </div>
              <Users size={20} style={{ color: '#16A34A' }} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={audienceByAge}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" className="opacity-50 dark:opacity-20" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 12, fill: 'currentColor' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12, fill: 'currentColor' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, language === 'en' ? 'Audience' : 'Khán giả']} />
                <Bar dataKey="total" fill="#16A34A" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">{language === 'en' ? 'Recent orders' : 'Đơn gần đây'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {language === 'en' ? 'Showing the latest 4 orders only' : 'Chỉ hiển thị 4 đơn mới nhất'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {Math.min(recentOrders.length, 4)}/{orders.length} {language === 'en' ? 'orders' : 'đơn'}
              </span>
              <Link
                to="/admin/orders"
                className="rounded-md px-3 py-1.5 text-xs font-black text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70"
              >
                {language === 'en' ? 'View all' : 'Xem tất cả'}
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {[(language === 'en' ? 'Order ID' : 'Mã đơn'), (language === 'en' ? 'Event' : 'Sự kiện'), (language === 'en' ? 'Tickets' : 'Số vé'), (language === 'en' ? 'Amount' : 'Tổng tiền'), (language === 'en' ? 'Status' : 'Trạng thái'), (language === 'en' ? 'Time' : 'Thời gian')].map(head => (
                    <th key={head} className="px-3 py-2 text-left text-xs font-black uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr
                    key={order.order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedOrder(order.order)}
                    onKeyDown={eventKey => {
                      if (eventKey.key === 'Enter' || eventKey.key === ' ') setSelectedOrder(order.order);
                    }}
                    className="cursor-pointer border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-3 font-mono font-bold text-orange-500">{order.code}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{order.event}</td>
                    <td className="px-3 py-3">{order.items}</td>
                    <td className="px-3 py-3 font-bold">{formatPrice(order.amount)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${getOrderStatusTone(order.status)}`}>
                        {getOrderStatusLabel(order.status, language)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{order.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                {apiReady
                  ? (adminOrdersAvailable === false
                    ? (language === 'en'
                      ? 'Waiting for GET /api/admin/orders from the backend.'
                      : 'Đang chờ backend thêm GET /api/admin/orders.')
                    : (language === 'en'
                      ? 'No customer transactions have been returned yet.'
                      : 'Chưa có giao dịch khách hàng nào được API trả về.'))
                  : (language === 'en' ? 'No orders yet' : 'Chưa có đơn hàng')}
              </div>
            )}
          </div>
        </section>
      </div>
      <AdminOrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </main>
  );
}
