import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CreditCard, Clock, CheckCircle, ArrowLeft, ShieldCheck, Ticket } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatPrice, formatDate } from '../data/mockData';
import type { PaymentMethod } from '../data/types';
import { SERVICE_FEE_RATE } from '../data/types';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'VNPAY', label: 'VNPay',     icon: '💳' },
  { value: 'MOMO',  label: 'MoMo',      icon: '💜' },
  { value: 'CARD',  label: 'Thẻ ngân hàng', icon: '🏦' },
];

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getEvent, getUserSeats, confirmOrder, holdExpiry, clearUserSeats, setHoldExpiry, user } = useApp();

  const eventId = location.state?.eventId as string | undefined;
  const event = getEvent(eventId ?? '');
  const userSeats = getUserSeats(eventId ?? '');
  const seatsReadyForCheckout = Boolean(holdExpiry) && userSeats.length > 0 && userSeats.every(seat => seat.status === 'locked');

  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<ReturnType<typeof confirmOrder> | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VNPAY');

  // Timer countdown
  useEffect(() => {
    if (!holdExpiry) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((holdExpiry.getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0 && !done) {
        clearInterval(interval);
        clearUserSeats(eventId ?? '');
        setHoldExpiry(null);
        toast.error('Hết thời gian giữ chỗ!');
        navigate(`/events/${eventId}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiry, done, eventId, clearUserSeats, setHoldExpiry, navigate]);

  const itemTotal = userSeats.reduce((s, seat) => s + seat.price, 0);
  const serviceFee = Math.round(itemTotal * SERVICE_FEE_RATE);
  const totalAmount = itemTotal + serviceFee;

  const timerMin = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 10;
  const timerSec = secondsLeft !== null ? secondsLeft % 60 : 0;
  const timerWarning = secondsLeft !== null && secondsLeft < 120;

  const handleConfirm = async () => {
    if (!eventId) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    const b = confirmOrder(eventId, paymentMethod);
    setLoading(false);
    if (b) {
      setOrder(b);
      setDone(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B35', '#FF3A8C', '#ffffff', '#F59E0B'],
      });
      toast.success('Đặt vé thành công!');
    } else {
      toast.error('Ghế chưa được giữ hoặc đã hết thời gian giữ chỗ');
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done && order) {
    return (
      <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
        className="flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
              <CheckCircle size={36} className="text-white" />
            </div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.8rem' }}>Đặt vé thành công!</h1>
            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Mã đơn hàng: <span style={{ color: '#FF6B35', fontWeight: 600 }}>{order.id}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl mb-4"
            style={{ background: '#12122A', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-3 pb-4 mb-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <img src={event?.banner_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <div className="text-xs" style={{ color: '#FF6B35' }}>{order.event_artist}</div>
                <div className="font-bold text-sm" style={{ color: '#fff' }}>{order.event_title}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {formatDate(order.event_date_start)} • {new Date(order.event_date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{item.seat_label}</span>
                  <span style={{ color: '#FF6B35' }}>{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Phí dịch vụ</span>
              <span style={{ color: '#F59E0B' }}>{formatPrice(order.service_fee)}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-semibold" style={{ color: '#fff' }}>Tổng thanh toán</span>
              <span className="font-bold text-lg" style={{ color: '#FF6B35' }}>{formatPrice(order.total_amount)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/tickets')}
              className="flex-1 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
              Xem vé của tôi
            </button>
            <button onClick={() => navigate('/')}
              className="flex-1 py-3 rounded-xl font-semibold transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
              Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event || !seatsReadyForCheckout) {
    return (
      <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
        className="flex items-center justify-center">
        <div className="text-center">
          <Ticket size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>
            Vui lòng giữ chỗ trước khi thanh toán
          </p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,107,53,0.2)', color: '#FF6B35' }}>
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#12122A', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={15} /> Quay lại
          </button>
          <h2 className="font-bold" style={{ color: '#fff' }}>Xác nhận đặt vé</h2>
          {holdExpiry && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{
                background: timerWarning ? 'rgba(255,107,107,0.15)' : 'rgba(16,185,129,0.15)',
                border: `1px solid ${timerWarning ? '#FF6B6B' : '#10B981'}40`,
              }}>
              <Clock size={12} style={{ color: timerWarning ? '#FF6B6B' : '#10B981' }} />
              <span className="font-mono text-xs font-bold"
                style={{ color: timerWarning ? '#FF6B6B' : '#10B981' }}>
                {String(timerMin).padStart(2, '0')}:{String(timerSec).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left: Order Details */}
          <div className="md:col-span-3 space-y-4">
            {/* Event info */}
            <div className="p-5 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                Thông tin sự kiện
              </h3>
              <div className="flex items-center gap-3">
                <img src={event.banner_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#FF6B35' }}>{event.artist}</div>
                  <div className="font-bold" style={{ color: '#fff' }}>{event.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {formatDate(event.date_start)} • {new Date(event.date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {event.venue}
                  </div>
                </div>
              </div>
            </div>

            {/* Seats */}
            <div className="p-5 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                Ghế đã chọn ({userSeats.length})
              </h3>
              <div className="space-y-2">
                {userSeats.map((seat, i) => {
                  const section = event.sections.find(s => s.section_name === seat.section_name);
                  return (
                    <div key={seat.id} className="flex items-center justify-between py-2"
                      style={{ borderBottom: i < userSeats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full"
                          style={{ background: section?.color ?? '#FF6B35' }} />
                        <span className="text-sm" style={{ color: '#fff' }}>
                          {seat.section_name} — Hàng {seat.row_label}, Ghế {seat.seat_number}
                        </span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#FF6B35' }}>
                        {formatPrice(seat.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Buyer info */}
            {user && (
              <div className="p-5 rounded-2xl"
                style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Thông tin người mua
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Họ tên', value: user.full_name },
                    { label: 'Email',  value: user.email },
                    ...(user.phone ? [{ label: 'Điện thoại', value: user.phone }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                      <span style={{ color: '#fff' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="p-5 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                Phương thức thanh toán
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: paymentMethod === pm.value ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${paymentMethod === pm.value ? '#FF6B35' : 'rgba(255,255,255,0.08)'}`,
                      color: paymentMethod === pm.value ? '#FF6B35' : 'rgba(255,255,255,0.6)',
                    }}>
                    <span style={{ fontSize: '1.2rem' }}>{pm.icon}</span>
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="md:col-span-2">
            <div className="sticky top-20 p-5 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4 font-semibold" style={{ color: '#fff' }}>Tóm tắt đơn hàng</h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Số lượng vé</span>
                  <span style={{ color: '#fff' }}>{userSeats.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Tạm tính</span>
                  <span style={{ color: '#fff' }}>{formatPrice(itemTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Phí dịch vụ ({(SERVICE_FEE_RATE * 100).toFixed(0)}%)</span>
                  <span style={{ color: '#F59E0B' }}>{formatPrice(serviceFee)}</span>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
              <div className="flex justify-between items-center mb-5">
                <span className="font-semibold" style={{ color: '#fff' }}>Tổng cộng</span>
                <span className="font-bold text-xl" style={{ color: '#FF6B35' }}>{formatPrice(totalAmount)}</span>
              </div>

              <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <ShieldCheck size={14} style={{ color: '#10B981' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Giao dịch được bảo mật
                </span>
              </div>

              <button onClick={handleConfirm} disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(255,107,53,0.3)',
                  cursor: loading ? 'wait' : 'pointer',
                }}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <><CreditCard size={16} /> XÁC NHẬN THANH TOÁN</>
                )}
              </button>

              <p className="text-xs text-center mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Thanh toán qua {paymentMethod}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
