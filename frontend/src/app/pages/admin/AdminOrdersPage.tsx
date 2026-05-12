import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ReceiptText, Search } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { usePreferences } from '../../store/PreferencesContext';
import { getOrderStatusLabel } from '../../data/types';
import type { Order } from '../../data/types';
import { formatPrice, USERS } from '../../data/mockData';
import AdminOrderDetailModal, { getOrderStatusTone, getVisibleOrderStatus } from './AdminOrderDetailModal';

interface OrderDayGroup {
  key: string;
  label: string;
  orders: Order[];
  paidRevenue: number;
  tickets: number;
}

function getOrderDayKey(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatOrderDayLabel(isoString: string, language: 'vi' | 'en'): string {
  return new Date(isoString).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatOrderTime(isoString: string, language: 'vi' | 'en'): string {
  return new Date(isoString).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrdersPage() {
  const { orders, orderItems, getEvent, apiReady, user, adminOrdersAvailable, refreshAdminOrders } = useApp();
  const { language } = usePreferences();
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (apiReady && user?.role === 'admin') {
      void refreshAdminOrders();
    }
  }, [apiReady, refreshAdminOrders, user?.role]);

  const itemCountByOrderId = useMemo(() => {
    const map = new Map<number, number>();
    orderItems.forEach(item => {
      map.set(item.order_id, (map.get(item.order_id) ?? 0) + 1);
    });
    return map;
  }, [orderItems]);

  const filteredOrders = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return orders
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter(order => {
        const event = getEvent(order.event_id);
        const customer = USERS.find(user => user.id === order.user_id);
        const customerName = order.customer_name ?? customer?.full_name;
        const customerEmail = order.customer_email ?? customer?.email;
        return (
          !normalized ||
          order.order_code.toLowerCase().includes(normalized) ||
          event?.title.toLowerCase().includes(normalized) ||
          customerName?.toLowerCase().includes(normalized) ||
          customerEmail?.toLowerCase().includes(normalized)
        );
      });
  }, [getEvent, orders, search]);

  const orderGroups = useMemo(() => {
    const groups = new Map<string, OrderDayGroup>();

    filteredOrders.forEach(order => {
      const key = getOrderDayKey(order.created_at);
      const group = groups.get(key) ?? {
        key,
        label: formatOrderDayLabel(order.created_at, language),
        orders: [],
        paidRevenue: 0,
        tickets: 0,
      };

      group.orders.push(order);
      group.tickets += itemCountByOrderId.get(order.id) ?? order.item_count ?? 0;
      if (getVisibleOrderStatus(order) === 'paid') {
        group.paidRevenue += order.total_amount;
      }
      groups.set(key, group);
    });

    return Array.from(groups.values());
  }, [filteredOrders, itemCountByOrderId, language]);

  const totalRevenue = orders.filter(order => getVisibleOrderStatus(order) === 'paid').reduce((sum, order) => sum + order.total_amount, 0);
  const paidOrders = orders.filter(order => getVisibleOrderStatus(order) === 'paid').length;
  const pendingOrders = orders.filter(order => getVisibleOrderStatus(order) === 'pending').length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-black uppercase text-orange-500">{language === 'en' ? 'Orders' : 'Đơn hàng'}</p>
            <h1 className="text-2xl font-black">{language === 'en' ? 'Order Management' : 'Quản lý đơn hàng'}</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right text-sm">
            <div className="rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <div className="font-black">{orders.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'en' ? 'Orders' : 'Đơn'}</div>
            </div>
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <div className="font-black">{paidOrders}</div>
              <div className="text-xs">{language === 'en' ? 'Paid' : 'Đã trả'}</div>
            </div>
            <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <div className="font-black">{pendingOrders}</div>
              <div className="text-xs">{language === 'en' ? 'Pending' : 'Chờ trả'}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={language === 'en' ? 'Search order, customer or event' : 'Tìm mã đơn, khách hàng hoặc sự kiện'}
              className="w-full rounded-md py-3 pl-9 pr-3 text-sm outline-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-orange-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md px-3 py-2 text-sm font-black text-slate-700 bg-white border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
              {filteredOrders.length} {language === 'en' ? 'orders' : 'đơn'} • {orderGroups.length} {language === 'en' ? 'days' : 'ngày'}
            </div>
            <div className="rounded-md px-3 py-2 text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
              {language === 'en' ? 'Paid revenue' : 'Doanh thu đã thanh toán'}: {formatPrice(totalRevenue)}
            </div>
          </div>
        </div>

        {orderGroups.length > 0 ? (
          <div className="space-y-4">
            {orderGroups.map(group => (
              <section key={group.key} className="overflow-hidden rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-2">
                    <CalendarDays size={18} className="shrink-0 text-orange-500" />
                    <div className="min-w-0">
                      <h2 className="font-black">{group.label}</h2>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {group.orders.length} {language === 'en' ? 'orders' : 'đơn'}
                    </span>
                    <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      {group.tickets} {language === 'en' ? 'tickets' : 'vé'}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {formatPrice(group.paidRevenue)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        {[
                          language === 'en' ? 'Order' : 'Mã đơn',
                          language === 'en' ? 'Customer' : 'Khách hàng',
                          language === 'en' ? 'Event' : 'Sự kiện',
                          language === 'en' ? 'Tickets' : 'Vé',
                          language === 'en' ? 'Amount' : 'Tổng tiền',
                          language === 'en' ? 'Status' : 'Trạng thái',
                          language === 'en' ? 'Time' : 'Giờ tạo',
                        ].map(head => (
                          <th key={head} className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.orders.map(order => {
                        const event = getEvent(order.event_id);
                        const customer = USERS.find(user => user.id === order.user_id);
                        const customerName = order.customer_name ?? customer?.full_name;
                        const customerEmail = order.customer_email ?? customer?.email;
                        const visibleStatus = getVisibleOrderStatus(order);
                        return (
                          <tr
                            key={order.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedOrder(order)}
                            onKeyDown={eventKey => {
                              if (eventKey.key === 'Enter' || eventKey.key === ' ') setSelectedOrder(order);
                            }}
                            className="cursor-pointer border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-orange-500">{order.order_code}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold">{customerName ?? `${language === 'en' ? 'User' : 'Người dùng'} #${order.user_id}`}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{customerEmail ?? '-'}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{event?.title ?? `${language === 'en' ? 'Event' : 'Sự kiện'} #${order.event_id}`}</td>
                            <td className="px-4 py-3 font-bold">{itemCountByOrderId.get(order.id) ?? order.item_count ?? 0}</td>
                            <td className="px-4 py-3 font-bold">{formatPrice(order.total_amount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`rounded-md px-2 py-1 text-xs font-black ${getOrderStatusTone(visibleStatus)}`}>
                                {getOrderStatusLabel(visibleStatus, language)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">{formatOrderTime(order.created_at, language)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="py-16 text-center">
              <ReceiptText size={46} className="mx-auto mb-3 text-slate-300" />
              <div className="font-black">{language === 'en' ? 'No orders found' : 'Không tìm thấy đơn hàng'}</div>
              {apiReady && (
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                  {adminOrdersAvailable === false
                    ? (language === 'en'
                      ? 'Waiting for GET /api/admin/orders from the backend.'
                      : 'Đang chờ backend thêm GET /api/admin/orders.')
                    : (language === 'en'
                      ? 'No customer transactions have been returned yet.'
                      : 'Chưa có giao dịch khách hàng nào được API trả về.')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <AdminOrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </main>
  );
}
