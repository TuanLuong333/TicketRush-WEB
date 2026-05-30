import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import confetti from 'canvas-confetti';
import { ArrowLeft, Banknote, CheckCircle2, Clock, CreditCard, Landmark, ShieldCheck, Ticket, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { SERVICE_FEE_RATE } from '../data/types';
import type { Order, PaymentMethod, Seat } from '../data/types';
import { formatDateTime, formatPrice, makeSeatLabel } from '../data/mockData';

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof CreditCard }> = [
  { value: 'VNPAY', label: 'VNPay', icon: CreditCard },
  { value: 'MOMO', label: 'MoMo', icon: Banknote },
  { value: 'CARD', label: 'Thẻ ngân hàng', icon: Landmark },
];

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = usePreferences();
  const routeEventId = location.state?.eventId as number | undefined;
  const routeOrderId = location.state?.orderId as number | undefined;
  const {
    getEvent,
    getUserSeats,
    getSeatZone,
    confirmOrder,
    cancelHeldSeats,
    holdExpiry,
    clearUserSeats,
    setHoldExpiry,
    user,
    activeOrderId,
    orders,
    orderItems,
    seats,
    apiReady,
  } = useApp();

  const fallbackPendingOrder = orders
    .filter(order => (
      order.status === 'pending' &&
      (!routeEventId || order.event_id === routeEventId) &&
      new Date(order.expires_at).getTime() > Date.now()
    ))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const checkoutOrder = orders.find(order => order.id === routeOrderId)
    ?? orders.find(order => order.id === activeOrderId)
    ?? fallbackPendingOrder;
  const orderId = checkoutOrder?.id ?? routeOrderId ?? activeOrderId;
  const eventId = routeEventId ?? checkoutOrder?.event_id;
  const event = getEvent(eventId ?? 0);
  const userSeats = getUserSeats(eventId ?? 0);
  const checkoutItems = orderId ? orderItems.filter(item => item.order_id === orderId) : [];
  const checkoutSeats = userSeats.length > 0
    ? userSeats
    : checkoutItems.map(item => seats.find(seat => seat.id === item.seat_id)).filter((seat): seat is Seat => Boolean(seat));
  const expiry = holdExpiry ?? (checkoutOrder ? new Date(checkoutOrder.expires_at) : null);
  const ready = Boolean(event && checkoutOrder && checkoutOrder.status === 'pending' && checkoutSeats.length > 0 && expiry);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VNPAY');
  const [loading, setLoading] = useState(false);
  const [cancellingHold, setCancellingHold] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [confirmedSeats, setConfirmedSeats] = useState<Seat[]>([]);

  useEffect(() => {
    if (!expiry || !eventId || confirmedOrder) return;
    const timer = setInterval(() => {
      const next = Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0) {
        clearInterval(timer);
        clearUserSeats(eventId);
        setHoldExpiry(null);
        toast.error('Phiên giữ ghế đã hết hạn');
        navigate(`/events/${eventId}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [clearUserSeats, confirmedOrder, eventId, expiry, navigate, setHoldExpiry]);

  const itemSubtotal = checkoutItems.length > 0
    ? checkoutItems.reduce((sum, item) => sum + item.price, 0)
    : checkoutSeats.reduce((sum, seat) => sum + (getSeatZone(seat)?.price ?? 0), 0);
  const serviceFee = apiReady ? 0 : Math.round(itemSubtotal * SERVICE_FEE_RATE);
  const totalAmount = checkoutOrder?.total_amount ?? itemSubtotal + serviceFee;
  const timerMin = secondsLeft === null ? 10 : Math.floor(secondsLeft / 60);
  const timerSec = secondsLeft === null ? 0 : secondsLeft % 60;
  const timerWarning = secondsLeft !== null && secondsLeft < 120;

  const handleConfirm = async () => {
    if (!orderId) return;
    const seatSnapshot = [...checkoutSeats];
    setLoading(true);
    try {
      const order = await confirmOrder(orderId, paymentMethod);
      if (!order) {
        toast.error('Không thể xác nhận thanh toán');
        return;
      }
      setConfirmedOrder(order);
      setConfirmedSeats(seatSnapshot);
      confetti({ particleCount: 100, spread: 72, origin: { y: 0.62 }, colors: ['#F97316', '#0EA5E9', '#22C55E', '#ffffff'] });
      toast.success(language === 'en' ? 'Payment successful' : 'Thanh toán thành công');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'en' ? 'Payment failed' : 'Thanh toán thất bại'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelHold = async () => {
    if (!eventId || !orderId || cancellingHold) return;
    setCancellingHold(true);
    try {
      const cancelled = await cancelHeldSeats(eventId, orderId);
      if (cancelled) {
        toast.success(language === 'en' ? 'Held seats cancelled' : 'Đã hủy giữ ghế');
        navigate(`/events/${eventId}/seats`, { replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'en' ? 'Could not cancel held seats' : 'Không thể hủy giữ ghế'));
    } finally {
      setCancellingHold(false);
    }
  };

  if (confirmedOrder && event) {
    const paidSubtotal = confirmedSeats.reduce((sum, seat) => sum + (getSeatZone(seat)?.price ?? 0), 0);
    const paidFee = Math.round(paidSubtotal * SERVICE_FEE_RATE);

    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10" style={{ background: '#F8FAFC', color: '#0F172A' }}>
        <div className="w-full max-w-lg">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <CheckCircle2 size={40} />
            </div>
            <h1 className="text-3xl font-black">{language === 'en' ? 'Payment successful' : 'Đã thanh toán'}</h1>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>{language === 'en' ? 'Order code' : 'Mã đơn'} {confirmedOrder.order_code}</p>
          </div>

          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <div className="mb-4 flex gap-3">
              <img src={event.banner_url} alt={event.title} className="h-16 w-16 rounded-md object-cover" />
              <div>
                <h2 className="font-black">{event.title}</h2>
                <p className="text-sm" style={{ color: '#64748B' }}>{formatDateTime(event.event_time)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {confirmedSeats.map(seat => {
                const zone = getSeatZone(seat);
                return (
                  <div key={seat.id} className="flex justify-between gap-3 text-sm">
                    <span style={{ color: '#475569' }}>{makeSeatLabel(seat, zone, language)}</span>
                    <span className="font-bold">{formatPrice(zone?.price ?? 0)}</span>
                  </div>
                );
              })}
            </div>
            <div className="my-4 h-px" style={{ background: '#E2E8F0' }} />
            <div className="flex justify-between text-sm" style={{ color: '#64748B' }}>
              <span>{language === 'en' ? 'Service fee' : 'Phí dịch vụ'}</span>
              <span>{formatPrice(paidFee)}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-black">
              <span>{language === 'en' ? 'Total' : 'Tổng'}</span>
              <span style={{ color: '#F97316' }}>{formatPrice(confirmedOrder.total_amount)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/tickets')} className="rounded-md px-4 py-3 font-black text-white" style={{ background: '#F97316' }}>{language === 'en' ? 'My tickets' : 'Vé của tôi'}</button>
            <button onClick={() => navigate('/events')} className="rounded-md px-4 py-3 font-black" style={{ background: '#E2E8F0', color: '#0F172A' }}>{language === 'en' ? 'Events' : 'Sự kiện'}</button>
          </div>
        </div>
      </main>
    );
  }

  if (!event || !ready) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#F8FAFC', color: '#0F172A' }}>
        <div className="text-center">
          <Ticket size={48} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
          <h1 className="text-xl font-black">{language === 'en' ? 'No seats are being held' : 'Chưa có ghế được giữ'}</h1>
          <button onClick={() => navigate('/events')} className="mt-4 rounded-md px-4 py-2 text-sm font-bold text-white" style={{ background: '#0F172A' }}>
            {language === 'en' ? 'Choose event' : 'Chọn sự kiện'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <header className="sticky top-0 z-30" style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: '#475569' }}>
            <ArrowLeft size={16} /> {language === 'en' ? 'Back' : 'Quay lại'}
          </button>
          <h1 className="font-black">{language === 'en' ? 'Checkout' : 'Thanh toán'}</h1>
          {expiry && (
            <span className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-black" style={{ background: timerWarning ? '#FEF2F2' : '#ECFDF5', color: timerWarning ? '#DC2626' : '#047857' }}>
              <Clock size={14} /> {String(timerMin).padStart(2, '0')}:{String(timerSec).padStart(2, '0')}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <h2 className="mb-4 text-sm font-black uppercase" style={{ color: '#64748B' }}>{language === 'en' ? 'Event' : 'Sự kiện'}</h2>
            <div className="flex gap-4">
              <img src={event.banner_url} alt={event.title} className="h-20 w-20 rounded-md object-cover" />
              <div>
                <h3 className="text-lg font-black">{event.title}</h3>
                <p className="text-sm" style={{ color: '#64748B' }}>{formatDateTime(event.event_time)}</p>
                <p className="text-sm" style={{ color: '#64748B' }}>{event.location}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <h2 className="mb-4 text-sm font-black uppercase" style={{ color: '#64748B' }}>{language === 'en' ? 'Held seats' : 'Ghế đã giữ'}</h2>
            <div className="space-y-3">
              {checkoutSeats.map(seat => {
                const zone = getSeatZone(seat);
                return (
                  <div key={seat.id} className="flex items-center justify-between gap-3 rounded-md p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <span className="font-bold">{makeSeatLabel(seat, zone, language)}</span>
                    <span className="font-black" style={{ color: '#F97316' }}>{formatPrice(zone?.price ?? 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {user && (
            <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <h2 className="mb-4 text-sm font-black uppercase" style={{ color: '#64748B' }}>{language === 'en' ? 'Buyer' : 'Người mua'}</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="min-w-0"><span style={{ color: '#64748B' }}>{language === 'en' ? 'Full name' : 'Họ tên'}</span><div className="font-bold break-words">{user.full_name}</div></div>
                <div className="min-w-0"><span style={{ color: '#64748B' }}>Email</span><div className="font-bold break-all leading-6">{user.email}</div></div>
                <div className="min-w-0"><span style={{ color: '#64748B' }}>{language === 'en' ? 'Phone' : 'Điện thoại'}</span><div className="font-bold break-words">{user.phone || (language === 'en' ? 'Not updated' : 'Chưa cập nhật')}</div></div>
                <div className="min-w-0"><span style={{ color: '#64748B' }}>{language === 'en' ? 'User ID' : 'Mã người dùng'}</span><div className="font-bold">#{user.id}</div></div>
              </div>
            </div>
          )}

          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <h2 className="mb-4 text-sm font-black uppercase" style={{ color: '#64748B' }}>{language === 'en' ? 'Payment method' : 'Phương thức'}</h2>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon;
                const active = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className="rounded-md p-3 text-sm font-black"
                    style={{ background: active ? '#FFF7ED' : '#F8FAFC', color: active ? '#C2410C' : '#475569', border: `1px solid ${active ? '#FDBA74' : '#E2E8F0'}` }}
                  >
                    <Icon size={20} className="mx-auto mb-2" />
                    {language === 'en' && method.value === 'CARD' ? 'Bank card' : method.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside>
          <div className="sticky top-20 rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 22px 60px rgba(15,23,42,0.08)' }}>
            <h2 className="mb-4 font-black">{language === 'en' ? 'Summary' : 'Tóm tắt'}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span style={{ color: '#64748B' }}>{language === 'en' ? 'Tickets' : 'Số vé'}</span><span className="font-bold">{checkoutSeats.length}</span></div>
              <div className="flex justify-between"><span style={{ color: '#64748B' }}>{language === 'en' ? 'Subtotal' : 'Tạm tính'}</span><span className="font-bold">{formatPrice(itemSubtotal)}</span></div>
              <div className="flex justify-between"><span style={{ color: '#64748B' }}>{language === 'en' ? 'Service fee' : 'Phí dịch vụ'}</span><span className="font-bold">{formatPrice(serviceFee)}</span></div>
            </div>
            <div className="my-4 h-px" style={{ background: '#E2E8F0' }} />
            <div className="flex justify-between text-xl font-black">
              <span>{language === 'en' ? 'Total' : 'Tổng'}</span>
              <span style={{ color: '#F97316' }}>{formatPrice(totalAmount)}</span>
            </div>
            <div className="my-4 flex items-center gap-2 rounded-md p-3 text-sm" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
              <ShieldCheck size={16} />
              <span>{language === 'en' ? 'Seats are being held during the payment window' : 'Ghế đang được giữ trong thời hạn thanh toán'}</span>
            </div>
            <button onClick={handleConfirm} disabled={loading || cancellingHold} className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-black text-white" style={{ background: loading || cancellingHold ? '#FDBA74' : '#F97316' }}>
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <CreditCard size={17} />}
              {language === 'en' ? 'Confirm payment' : 'Xác nhận thanh toán'}
            </button>
            <button
              onClick={handleCancelHold}
              disabled={loading || cancellingHold}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-black"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', opacity: loading || cancellingHold ? 0.72 : 1 }}
            >
              {cancellingHold ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <XCircle size={17} />}
              {language === 'en' ? 'Cancel held seats' : 'Hủy giữ ghế'}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
