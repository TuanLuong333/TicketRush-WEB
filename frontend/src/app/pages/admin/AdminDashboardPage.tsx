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
import { Activity, Database, DollarSign, LockKeyhole, RefreshCw, Ticket, Users } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { usePreferences } from '../../store/PreferencesContext';
import { formatPrice } from '../../data/mockData';
import { getOrderStatusLabel } from '../../data/types';
import { apiClient } from '../../api/client';

interface DashboardData {
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  soldSeats: number;
  occupancyRate: number;
  revenue: number;
}

export default function AdminDashboardPage() {
  const { events, orders, orderItems, queueEntries, seatLockLogs, getStats, apiReady } = useApp();
  const { language, t } = usePreferences();
  const [now, setNow] = useState(new Date());
  const [dashboardMap, setDashboardMap] = useState<Record<number, DashboardData>>({});
  const [loadingDash, setLoadingDash] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboards = useCallback(async () => {
    if (!apiReady || events.length === 0) return;
    setLoadingDash(true);
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
      // Silently fail — we'll fallback to local stats
    } finally {
      setLoadingDash(false);
    }
  }, [apiReady, events]);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

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

  const eventOccupancy = useMemo(() => events.slice(0, 6).map(event => {
    const dash = dashboardMap[event.id];
    if (dash) {
      return {
        name: event.title.split(' ').slice(0, 2).join(' '),
        sold: dash.soldSeats,
        available: dash.availableSeats,
        occupancy: dash.occupancyRate,
      };
    }
    const stats = getStats(event.id);
    return {
      name: event.title.split(' ').slice(0, 2).join(' '),
      sold: stats.sold,
      available: stats.available,
      occupancy: stats.occupancy_pct,
    };
  }), [dashboardMap, events, getStats]);

  const revenueByEvent = useMemo(() => events.slice(0, 8).map(event => {
    const dash = dashboardMap[event.id];
    return {
      label: event.title.split(' ').slice(0, 2).join(' '),
      revenue: dash?.revenue || 0,
      tickets: dash?.soldSeats || 0,
    };
  }), [dashboardMap, events]);

  const recentOrders = orders.slice(-6).reverse().map(order => {
    const event = events.find(item => item.id === order.event_id);
    return {
      code: order.order_code,
      event: event?.title ?? 'Sự kiện',
      amount: order.total_amount,
      status: order.status,
      items: orderItems.filter(item => item.order_id === order.id).length,
      time: new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
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
          <div className="flex items-center gap-3">
            {apiReady && (
              <button
                onClick={() => { void loadDashboards(); }}
                disabled={loadingDash}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                title={language === 'en' ? 'Refresh data' : 'Làm mới dữ liệu'}
              >
                <RefreshCw size={14} className={loadingDash ? 'animate-spin' : ''} />
                {language === 'en' ? 'Refresh' : 'Làm mới'}
              </button>
            )}
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
              {now.toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN')}
            </div>
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
                <h2 className="font-black">{language === 'en' ? 'Revenue by event' : 'Doanh thu theo sự kiện'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{apiReady ? (language === 'en' ? 'From overview API' : 'Từ API tổng quan') : (language === 'en' ? 'From total orders amount' : 'Từ tổng tiền đơn hàng')}</p>
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
                <h2 className="font-black">{language === 'en' ? 'Event occupancy' : 'Lấp đầy sự kiện'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{apiReady ? (language === 'en' ? 'From overview API' : 'Từ API tổng quan') : (language === 'en' ? 'Calculated from seat states' : 'Tính từ trạng thái ghế')}</p>
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

        <section className="rounded-lg p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">{language === 'en' ? 'Recent orders' : 'Đơn gần đây'}</h2>
            <span className="rounded-md px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{orders.length} {language === 'en' ? 'orders' : 'đơn'}</span>
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
                  <tr key={order.code} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3 font-mono font-bold text-orange-500">{order.code}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{order.event}</td>
                    <td className="px-3 py-3">{order.items}</td>
                    <td className="px-3 py-3 font-bold">{formatPrice(order.amount)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{getOrderStatusLabel(order.status, language)}</td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{order.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
