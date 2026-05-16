import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import QRCode from 'react-qr-code';
import { CalendarDays, ChevronRight, MapPin, Search, Ticket, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import type { Order, OrderStatus } from '../data/types';
import { getOrderStatusLabel } from '../data/types';
import { formatDateTime, formatPrice, makeQrValue, makeSeatLabel } from '../data/mockData';

function getVisibleOrderStatus(order: Order): OrderStatus {
  if (order.status === 'pending' && new Date(order.expires_at).getTime() <= Date.now()) return 'expired';
  return order.status;
}

function isPayableOrder(order: Order): boolean {
  return order.status === 'pending' && new Date(order.expires_at).getTime() > Date.now();
}

function getStatusTone(status: OrderStatus) {
  if (status === 'paid') return { background: '#DCFCE7', color: '#166534' };
  if (status === 'pending') return { background: '#FEF3C7', color: '#92400E' };
  return { background: '#F1F5F9', color: '#475569' };
}

export default function MyTicketsPage() {
  const { user, orders, orderItems, seats, getEvent, getSeatZone, cancelHeldSeats } = useApp();
  const { language } = usePreferences();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  const visibleOrders = useMemo(() => {
    if (!user) return [];
    const ownOrders = user.role === 'admin' ? orders : orders.filter(order => order.user_id === user.id);
    const normalized = search.trim().toLowerCase();
    return ownOrders.filter(order => {
      const event = getEvent(order.event_id);
      return (
        !normalized ||
        order.order_code.toLowerCase().includes(normalized) ||
        event?.title.toLowerCase().includes(normalized)
      );
    });
  }, [getEvent, orders, search, user]);

  const goToCheckout = (order: Order) => {
    setSelectedOrder(null);
    navigate('/checkout', { state: { eventId: order.event_id, orderId: order.id } });
  };

  const handleCancelHold = async (order: Order) => {
    if (cancellingOrderId) return;

    setCancellingOrderId(order.id);
    try {
      const cancelled = await cancelHeldSeats(order.event_id, order.id);
      if (cancelled) {
        toast.success(language === 'en' ? 'Held seats cancelled' : 'Đã hủy giữ ghế');
        setSelectedOrder(current => current?.id === order.id ? null : current);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'en' ? 'Could not cancel held seats' : 'Không thể hủy giữ ghế'));
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#F8FAFC', color: '#0F172A' }}>
        <div className="text-center">
          <Ticket size={52} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
          <h1 className="text-xl font-black">{language === 'en' ? 'Sign in to view tickets' : 'Đăng nhập để xem vé'}</h1>
          <button onClick={() => navigate('/login')} className="mt-4 rounded-md px-5 py-2.5 font-bold text-white" style={{ background: '#F97316' }}>
            {language === 'en' ? 'Sign in' : 'Đăng nhập'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-sm font-black uppercase" style={{ color: '#F97316' }}>{language === 'en' ? 'Booked tickets' : 'Vé đã đặt'}</p>
            <h1 className="text-3xl font-black">{language === 'en' ? 'My tickets' : 'Vé của tôi'}</h1>
            <p className="mt-1 text-sm" style={{ color: '#64748B' }}>{visibleOrders.length} {language === 'en' ? 'orders shown' : 'đơn hiển thị'}</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={language === 'en' ? 'Search order code or event' : 'Tìm mã đơn hoặc sự kiện'}
              className="w-full rounded-md py-3 pl-9 pr-3 text-sm outline-none"
              style={{ background: '#fff', border: '1px solid #CBD5E1' }}
            />
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="rounded-lg py-20 text-center" style={{ background: '#fff', border: '1px dashed #CBD5E1' }}>
            <Ticket size={52} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
            <h2 className="font-black">{language === 'en' ? 'No tickets yet' : 'Chưa có vé'}</h2>
            <button onClick={() => navigate('/events')} className="mt-4 rounded-md px-4 py-2 text-sm font-bold text-white" style={{ background: '#0F172A' }}>
              {language === 'en' ? 'View events' : 'Xem sự kiện'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map(order => {
              const event = getEvent(order.event_id);
              const items = orderItems.filter(item => item.order_id === order.id);
              const visibleStatus = getVisibleOrderStatus(order);
              const statusTone = getStatusTone(visibleStatus);
              const payable = isPayableOrder(order);
              const cancellable = payable && user.role === 'customer' && order.user_id === user.id;
              const cancelling = cancellingOrderId === order.id;
              return (
                <div
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrder(order)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedOrder(order);
                  }}
                  className="block w-full cursor-pointer overflow-hidden rounded-lg text-left transition-transform hover:-translate-y-0.5"
                  style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 18px 44px rgba(15,23,42,0.06)' }}
                >
                  <div className="flex flex-col sm:flex-row">
                    <img src={event?.banner_url} alt={event?.title ?? order.order_code} className="h-40 w-full object-cover sm:h-auto sm:w-40" />
                    <div className="flex-1 p-4">
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase" style={{ color: '#F97316' }}>{order.order_code}</p>
                          <h2 className="text-lg font-black">{event?.title ?? (language === 'en' ? 'Event' : 'Sự kiện')}</h2>
                        </div>
                        <span className="rounded-md px-2 py-1 text-xs font-black" style={statusTone}>
                          {getOrderStatusLabel(visibleStatus, language)}
                        </span>
                      </div>
                      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ color: '#64748B' }}>
                        {event && <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {formatDateTime(event.event_time)}</span>}
                        {event && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {event.location}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: '#F1F5F9', color: '#475569' }}>{items.length} {language === 'en' ? 'tickets' : 'vé'}</span>
                          <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: '#F1F5F9', color: '#475569' }}>{order.payment_method ?? (language === 'en' ? 'Not selected' : 'Chưa chọn')}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="flex items-center gap-2 font-black" style={{ color: '#F97316' }}>
                            {formatPrice(order.total_amount)} <ChevronRight size={16} />
                          </div>
                          {payable && (
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                goToCheckout(order);
                              }}
                              disabled={cancelling}
                              className="rounded-md px-3 py-2 text-xs font-black text-white"
                              style={{ background: cancelling ? '#FDBA74' : '#F97316' }}
                            >
                              {language === 'en' ? 'Pay now' : 'Thanh toán ngay'}
                            </button>
                          )}
                          {cancellable && (
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                void handleCancelHold(order);
                              }}
                              disabled={cancelling}
                              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-black"
                              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', opacity: cancelling ? 0.72 : 1 }}
                            >
                              {cancelling ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <XCircle size={13} />}
                              {language === 'en' ? 'Cancel hold' : 'Hủy giữ'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedOrder(null)}>
          <div className="tr-ticket-modal max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg" style={{ background: '#fff', color: '#0F172A' }} onClick={event => event.stopPropagation()}>
            {(() => {
              const event = getEvent(selectedOrder.event_id);
              const items = orderItems.filter(item => item.order_id === selectedOrder.id);
              const firstItem = items[0];
              const visibleStatus = getVisibleOrderStatus(selectedOrder);
              const payable = isPayableOrder(selectedOrder);
              const cancellable = payable && user.role === 'customer' && selectedOrder.user_id === user.id;
              const cancelling = cancellingOrderId === selectedOrder.id;
              const expiredPending = selectedOrder.status === 'pending' && visibleStatus === 'expired';
              return (
                <>
                  <div className="relative">
                    <img src={event?.banner_url} alt={event?.title ?? ''} className="h-44 w-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.05), rgba(15,23,42,0.72))' }} />
                    <button onClick={() => setSelectedOrder(null)} className="tr-ticket-close absolute right-3 top-3 rounded-full p-2" style={{ background: 'rgba(255,255,255,0.9)', color: '#0F172A' }} aria-label={language === 'en' ? 'Close' : 'Đóng'}>
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xs font-bold uppercase" style={{ color: '#FDBA74' }}>{selectedOrder.order_code}</p>
                      <h2 className="text-xl font-black">{event?.title}</h2>
                    </div>
                  </div>
                  <div className="tr-ticket-modal-body p-5">
                    <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="tr-ticket-label" style={{ color: '#64748B' }}>{language === 'en' ? 'Event date' : 'Ngày diễn'}</span><div className="font-bold">{event ? formatDateTime(event.event_time) : (language === 'en' ? 'None' : 'Không có')}</div></div>
                      <div><span className="tr-ticket-label" style={{ color: '#64748B' }}>{language === 'en' ? 'Status' : 'Trạng thái'}</span><div className="font-bold">{getOrderStatusLabel(visibleStatus, language)}</div></div>
                      <div><span className="tr-ticket-label" style={{ color: '#64748B' }}>{language === 'en' ? 'Payment' : 'Thanh toán'}</span><div className="font-bold">{selectedOrder.payment_method ?? (language === 'en' ? 'Not selected' : 'Chưa chọn')}</div></div>
                      <div><span className="tr-ticket-label" style={{ color: '#64748B' }}>{language === 'en' ? 'Total' : 'Tổng tiền'}</span><div className="font-bold">{formatPrice(selectedOrder.total_amount)}</div></div>
                    </div>

                    <div className="mb-5">
                      <p className="tr-ticket-label mb-2 text-sm font-black" style={{ color: '#64748B' }}>{language === 'en' ? 'Seats' : 'Ghế'}</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map(item => {
                          const seat = seats.find(candidate => candidate.id === item.seat_id);
                          const zone = seat ? getSeatZone(seat) : undefined;
                          return (
                            <span key={item.id} className="tr-ticket-seat-chip rounded-md px-2 py-1 text-xs font-black" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                              {seat ? makeSeatLabel(seat, zone, language) : `${language === 'en' ? 'Seat' : 'Ghế'} #${item.seat_id}`}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {selectedOrder.status === 'paid' ? (
                      <>
                        <div className="tr-ticket-qr mx-auto mb-4 flex w-fit rounded-lg p-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                          <QRCode value={firstItem ? makeQrValue(selectedOrder, firstItem) : selectedOrder.order_code} size={172} />
                        </div>
                        <p className="tr-ticket-code mb-4 text-center font-mono text-xs" style={{ color: '#64748B' }}>
                          {firstItem ? makeQrValue(selectedOrder, firstItem) : selectedOrder.order_code}
                        </p>
                      </>
                    ) : payable ? (
                      <div className="mb-4 space-y-2">
                        <button
                          type="button"
                          onClick={() => goToCheckout(selectedOrder)}
                          disabled={cancelling}
                          className="w-full rounded-md px-4 py-3 font-black text-white"
                          style={{ background: cancelling ? '#FDBA74' : '#F97316' }}
                        >
                          {language === 'en' ? 'Pay now' : 'Thanh toán ngay'}
                        </button>
                        {cancellable && (
                          <button
                            type="button"
                            onClick={() => void handleCancelHold(selectedOrder)}
                            disabled={cancelling}
                            className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-black"
                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', opacity: cancelling ? 0.72 : 1 }}
                          >
                            {cancelling ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <XCircle size={17} />}
                            {language === 'en' ? 'Cancel held seats' : 'Hủy giữ ghế'}
                          </button>
                        )}
                      </div>
                    ) : expiredPending ? (
                      <div className="mb-4 rounded-md p-3 text-sm font-bold" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                        {language === 'en' ? 'This hold has expired. Please book the seats again.' : 'Phiên giữ ghế đã hết hạn. Vui lòng đặt vé lại.'}
                      </div>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </main>
  );
}
