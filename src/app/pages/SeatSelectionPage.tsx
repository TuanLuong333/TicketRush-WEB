import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Clock, AlertCircle, ShoppingCart, Trash2, CheckCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { SeatMap } from '../components/SeatMap';
import { formatPrice, formatDate } from '../data/mockData';
import type { EventSeat } from '../data/types';
import { toast } from 'sonner';

const MAX_SELECT = 8;
const HOLD_MINUTES = 10;

export default function SeatSelectionPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getEvent, getSeats, selectSeat, deselectSeat,
    getUserSeats, clearUserSeats, holdSeats, holdExpiry, setHoldExpiry,
  } = useApp();

  const event = getEvent(eventId ?? '');
  const seats = getSeats(eventId ?? '');
  const userSeats = getUserSeats(eventId ?? '');
  const selectedCount = userSeats.filter(s => s.status === 'selected').length;
  const totalUserSeats = userSeats.length;

  // Hold countdown
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!holdExpiry) { setSecondsLeft(null); return; }
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((holdExpiry.getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) {
        clearInterval(interval);
        clearUserSeats(eventId ?? '');
        setHoldExpiry(null);
        toast.error('Hết thời gian giữ chỗ! Ghế đã được nhả lại.');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiry, eventId, clearUserSeats, setHoldExpiry]);

  const handleSeatClick = (seat: EventSeat) => {
    if (!eventId) return;
    if (seat.status === 'selected') {
      deselectSeat(eventId, seat.id);
    } else if (seat.status === 'available') {
      if (selectedCount >= MAX_SELECT) {
        toast.error(`Bạn chỉ có thể chọn tối đa ${MAX_SELECT} ghế`);
        return;
      }
      selectSeat(eventId, seat.id);
    }
  };

  const handleHoldSeats = () => {
    if (!eventId || selectedCount === 0) return;
    holdSeats(eventId);
    setSecondsLeft(HOLD_MINUTES * 60);
    toast.success(`Đã giữ ${selectedCount} ghế trong ${HOLD_MINUTES} phút!`);
  };

  const handleCheckout = () => {
    if (!eventId || totalUserSeats === 0) return;
    navigate('/checkout', { state: { eventId } });
  };

  const totalAmount = userSeats.reduce((s, seat) => s + seat.price, 0);
  const timerWarning = secondsLeft !== null && secondsLeft < 120;
  const timerColor = timerWarning ? '#FF6B6B' : '#10B981';
  const timerMinutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : HOLD_MINUTES;
  const timerSeconds = secondsLeft !== null ? secondsLeft % 60 : 0;

  if (!event) {
    return (
      <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }} className="flex items-center justify-center">
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Không tìm thấy sự kiện</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#12122A', borderBottom: '1px solid rgba(255,255,255,0.08)' }} className="sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => { clearUserSeats(eventId ?? ''); navigate(`/events/${eventId}`); }}
                className="p-2 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.6)' }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="text-xs" style={{ color: '#FF6B35' }}>{event.artist}</div>
                <div className="font-semibold text-sm" style={{ color: '#fff' }}>{event.title}</div>
              </div>
            </div>

            {/* Hold Timer */}
            {holdExpiry && secondsLeft !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{
                  background: timerWarning ? 'rgba(255,107,107,0.15)' : 'rgba(16,185,129,0.15)',
                  border: `1px solid ${timerColor}40`,
                }}>
                <Clock size={14} style={{ color: timerColor }} />
                <span className="text-sm font-mono font-bold" style={{ color: timerColor }}>
                  {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>còn lại</span>
              </div>
            )}

            <div className="text-xs hidden md:block" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {formatDate(event.date_start)} • {new Date(event.date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {event.venue}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Seat Map */}
          <div className="xl:col-span-3">
            <div className="p-6 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ color: '#fff', fontWeight: 700 }}>Chọn Ghế</h2>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Đã chọn: <span style={{ color: '#FF6B35', fontWeight: 700 }}>{selectedCount}</span>/{MAX_SELECT}
                </div>
              </div>
              <SeatMap
                eventId={eventId ?? ''}
                sections={event.sections}
                seats={seats}
                onSeatClick={handleSeatClick}
                maxSelect={MAX_SELECT}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="xl:col-span-1">
            <div className="sticky top-32">
              <div className="p-5 rounded-2xl mb-4"
                style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="mb-4 font-semibold" style={{ color: '#fff' }}>
                  Giỏ hàng ({totalUserSeats})
                </h3>

                {totalUserSeats === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Chưa chọn ghế nào
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Click vào ghế trống để chọn
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {userSeats.map(seat => (
                      <div key={seat.id} className="flex items-center justify-between p-2.5 rounded-lg"
                        style={{
                          background: seat.status === 'locked' ? 'rgba(245,158,11,0.1)' : 'rgba(255,107,53,0.1)',
                          border: `1px solid ${seat.status === 'locked' ? 'rgba(245,158,11,0.2)' : 'rgba(255,107,53,0.2)'}`,
                        }}>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: '#fff' }}>
                            {seat.section_name} — Hàng {seat.row_label}, Ghế {seat.seat_number}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs" style={{ color: '#FF6B35' }}>{formatPrice(seat.price)}</span>
                            {seat.status === 'locked' && (
                              <span className="text-xs" style={{ color: '#F59E0B' }}>• Đã giữ</span>
                            )}
                          </div>
                        </div>
                        {seat.status === 'selected' && (
                          <button onClick={() => deselectSeat(eventId!, seat.id)}
                            className="p-1 rounded transition-colors hover:bg-white/10"
                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {totalUserSeats > 0 && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Tổng cộng</span>
                      <span className="font-bold text-lg" style={{ color: '#FF6B35' }}>{formatPrice(totalAmount)}</span>
                    </div>

                    {!holdExpiry && selectedCount > 0 ? (
                      <button onClick={handleHoldSeats}
                        className="w-full py-3 rounded-xl font-semibold text-sm mb-2 transition-all hover:scale-105"
                        style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10B981', color: '#10B981' }}>
                        <span className="flex items-center justify-center gap-2">
                          <Clock size={14} /> Giữ chỗ ({HOLD_MINUTES} phút)
                        </span>
                      </button>
                    ) : holdExpiry ? (
                      <div className="flex items-center gap-2 mb-2 p-2 rounded-lg"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <CheckCircle size={14} style={{ color: '#10B981' }} />
                        <span className="text-xs" style={{ color: '#10B981' }}>Ghế đã được giữ</span>
                      </div>
                    ) : null}

                    <button onClick={handleCheckout}
                      className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
                        boxShadow: '0 6px 20px rgba(255,107,53,0.3)',
                      }}>
                      Tiến hành thanh toán
                    </button>
                  </>
                )}
              </div>

              {/* Notice */}
              <div className="p-4 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex gap-2">
                  <AlertCircle size={14} style={{ color: '#F59E0B', marginTop: 2, flexShrink: 0 }} />
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>Lưu ý:</span> Ghế sẽ được giữ tối đa 10 phút sau khi chọn. Quá thời hạn, ghế sẽ tự động nhả lại.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
