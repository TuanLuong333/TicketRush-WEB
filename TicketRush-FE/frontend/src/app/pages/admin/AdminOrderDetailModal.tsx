import { CalendarDays, CreditCard, MapPin, Ticket, UserRound, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { usePreferences } from '../../store/PreferencesContext';
import { getOrderStatusLabel } from '../../data/types';
import type { Order, OrderStatus } from '../../data/types';
import { formatDateTime, formatPrice, makeSeatLabel, USERS } from '../../data/mockData';

export function getVisibleOrderStatus(order: Pick<Order, 'status' | 'expires_at'>): OrderStatus {
  if (order.status === 'pending' && new Date(order.expires_at).getTime() <= Date.now()) return 'expired';
  return order.status;
}

export function getOrderStatusTone(status: OrderStatus) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
  if (status === 'pending') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
  if (status === 'expired' || status === 'cancelled') return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

interface AdminOrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
}

export default function AdminOrderDetailModal({ order, onClose }: AdminOrderDetailModalProps) {
  const { orderItems, seats, getEvent, getSeatZone } = useApp();
  const { language } = usePreferences();

  if (!order) return null;

  const event = getEvent(order.event_id);
  const customer = USERS.find(user => user.id === order.user_id);
  const customerName = order.customer_name ?? customer?.full_name;
  const customerEmail = order.customer_email ?? customer?.email;
  const customerPhone = order.customer_phone ?? customer?.phone;
  const items = orderItems.filter(item => item.order_id === order.id);
  const visibleStatus = getVisibleOrderStatus(order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100"
        onClick={clickEvent => clickEvent.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-black uppercase text-orange-500">{order.order_code}</p>
            <h2 className="text-xl font-black">{language === 'en' ? 'Order details' : 'Chi tiết đơn hàng'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={language === 'en' ? 'Close order details' : 'Đóng chi tiết đơn hàng'}
            className="rounded-md p-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
          <section className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center gap-2 font-black">
                <Ticket size={17} className="text-orange-500" />
                {language === 'en' ? 'Tickets' : 'Thông tin vé'}
              </div>
              <div className="space-y-2">
                {items.length > 0 ? (
                  items.map(item => {
                    const seat = seats.find(candidate => candidate.id === item.seat_id);
                    const zone = seat ? getSeatZone(seat) : undefined;
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950">
                        <span className="font-bold">{seat ? makeSeatLabel(seat, zone, language) : `${language === 'en' ? 'Seat' : 'Ghế'} #${item.seat_id}`}</span>
                        <span className="font-black text-orange-500">{formatPrice(item.price)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    {language === 'en' ? 'No ticket line items have been returned yet.' : 'Chưa có chi tiết vé được trả về.'}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center gap-2 font-black">
                <UserRound size={17} className="text-sky-500" />
                {language === 'en' ? 'Customer' : 'Khách hàng'}
              </div>
              <div className="space-y-1 text-sm">
                <div className="font-bold">{customerName ?? `${language === 'en' ? 'User' : 'Người dùng'} #${order.user_id}`}</div>
                <div className="text-slate-500 dark:text-slate-400">{customerEmail ?? '-'}</div>
                <div className="text-slate-500 dark:text-slate-400">{customerPhone ?? '-'}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center gap-2 font-black">
                <CalendarDays size={17} className="text-emerald-500" />
                {language === 'en' ? 'Event' : 'Sự kiện'}
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-bold">{event?.title ?? `${language === 'en' ? 'Event' : 'Sự kiện'} #${order.event_id}`}</div>
                {event && (
                  <div className="flex gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    {event.location}
                  </div>
                )}
                {event && <div className="text-slate-500 dark:text-slate-400">{formatDateTime(event.event_time)}</div>}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center gap-2 font-black">
                <CreditCard size={17} className="text-violet-500" />
                {language === 'en' ? 'Payment' : 'Thanh toán'}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{language === 'en' ? 'Status' : 'Trạng thái'}</span>
                  <b>{getOrderStatusLabel(visibleStatus, language)}</b>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{language === 'en' ? 'Method' : 'Phương thức'}</span>
                  <b>{order.payment_method ?? '-'}</b>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{language === 'en' ? 'Total' : 'Tổng tiền'}</span>
                  <b className="text-orange-500">{formatPrice(order.total_amount)}</b>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{language === 'en' ? 'Created' : 'Tạo lúc'}</span>
                  <b>{formatDateTime(order.created_at)}</b>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{language === 'en' ? 'Expires' : 'Hết hạn'}</span>
                  <b>{formatDateTime(order.expires_at)}</b>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
