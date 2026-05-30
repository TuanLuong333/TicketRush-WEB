import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SeatMap } from '../components/SeatMap';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { formatDateTime, formatPrice, getQueueThreshold, makeSeatLabel, requiresQueue } from '../data/mockData';
import { QUEUE_FEATURE_ENABLED, type Seat } from '../data/types';

const MAX_SELECT = 8;
const HOLD_SECONDS = 10 * 60;

export default function SeatSelectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getEvent,
    getZones,
    getSeats,
    getSeatZone,
    getZoneLayout,
    getStats,
    getUserSeats,
    selectSeat,
    deselectSeat,
    clearUserSeats,
    holdSeats,
    cancelHeldSeats,
    holdExpiry,
    setHoldExpiry,
    activeOrderId,
    refreshSeatMap,
    currentQueueEntry,
    enterQueue,
    trackTicketPageVisit,
  } = useApp();
  const { language } = usePreferences();

  const event = getEvent(id ?? 0);
  const eventId = event?.id ?? 0;
  const zones = getZones(eventId);
  const seats = getSeats(eventId);
  const layouts = zones.map(zone => getZoneLayout(zone.id));
  const userSeats = getUserSeats(eventId);
  const selectedCount = userSeats.filter(seat => seat.status === 'selected').length;
  const lockedCount = userSeats.filter(seat => seat.status === 'locked').length;
  const canCheckout = Boolean(holdExpiry && activeOrderId) && userSeats.length > 0 && lockedCount === userSeats.length;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [cancellingHold, setCancellingHold] = useState(false);
  const currentQueueEntryRef = useRef(currentQueueEntry);
  const eventRef = useRef(event);
  const enterQueueRef = useRef(enterQueue);
  const getStatsRef = useRef(getStats);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    currentQueueEntryRef.current = currentQueueEntry;
    eventRef.current = event;
    enterQueueRef.current = enterQueue;
    getStatsRef.current = getStats;
    navigateRef.current = navigate;
  }, [currentQueueEntry, enterQueue, event, getStats, navigate]);

  useEffect(() => {
    // Queue code is temporarily disabled by QUEUE_FEATURE_ENABLED.
    if (!QUEUE_FEATURE_ENABLED) return undefined;
    if (!eventId) return undefined;

    const visit = trackTicketPageVisit(eventId);
    let active = true;
    let redirected = false;
    const enforceQueue = () => {
      if (!active || redirected) return;
      const currentEvent = eventRef.current;
      if (!currentEvent) return;
      const snapshot = visit.getSnapshot();
      const threshold = getQueueThreshold(currentEvent) ?? 0;
      const queueEntry = currentQueueEntryRef.current;
      const hasQueueAccess = queueEntry?.event_id === currentEvent.id && (
        queueEntry.status === 'active' || queueEntry.status === 'completed'
      );
      const load = {
        activeVisitors: snapshot.activeVisitors,
      };

      if (!hasQueueAccess && threshold > 0 && snapshot.visitorRank > threshold && requiresQueue(currentEvent, getStatsRef.current(currentEvent.id), load)) {
        redirected = true;
        active = false;
        visit.cleanup();
        void enterQueueRef.current(currentEvent.id).then(() => navigateRef.current(`/queue/${currentEvent.id}`));
      }
    };

    enforceQueue();
    const timer = window.setInterval(enforceQueue, 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
      if (!redirected) visit.cleanup();
    };
  }, [eventId, trackTicketPageVisit]);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    const refresh = async () => {
      try {
        await refreshSeatMap(eventId);
      } catch {
        // Keep the current map visible; the next poll can recover when backend is reachable.
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      if (active) void refresh();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [eventId, refreshSeatMap]);

  useEffect(() => {
    if (!holdExpiry) {
      setSecondsLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const next = Math.max(0, Math.floor((holdExpiry.getTime() - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0) {
        clearInterval(timer);
        clearUserSeats(eventId);
        setHoldExpiry(null);
        toast.error(language === 'en' ? 'Held seats have expired' : 'Ghế giữ đã hết hạn');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [clearUserSeats, eventId, holdExpiry, setHoldExpiry]);

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: '#F8FAFC' }}>
        <p>{language === 'en' ? 'Event not found' : 'Không tìm thấy sự kiện'}</p>
      </main>
    );
  }

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'selected') {
      deselectSeat(event.id, seat.id);
      return;
    }

    if (seat.status === 'available') {
      if (holdExpiry) {
        toast.error(language === 'en' ? 'Seats are already held. Please pay or start over.' : 'Ghế đã được giữ, hãy thanh toán hoặc chọn lại từ đầu');
        return;
      }
      if (selectedCount >= MAX_SELECT) {
        toast.error(language === 'en' ? `Select up to ${MAX_SELECT} seats` : `Chỉ chọn tối đa ${MAX_SELECT} ghế`);
        return;
      }
      selectSeat(event.id, seat.id);
    }
  };

  const handleHold = async () => {
    if (selectedCount === 0) return;
    try {
      const result = await holdSeats(event.id);
      if (result.queueRequired) {
        toast.info(result.message || (language === 'en' ? 'Please join the queue before holding seats' : 'Bạn cần vào hàng chờ trước khi giữ ghế'));
        navigate(`/queue/${event.id}`);
        return;
      }
      if (result.order) {
        setSecondsLeft(HOLD_SECONDS);
        toast.success(language === 'en' ? `Held ${selectedCount} seats for 10 minutes` : `Đã giữ ${selectedCount} ghế trong 10 phút`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'en' ? 'Could not hold seats' : 'Không thể giữ ghế'));
    }
  };

  const handleCancelHold = async () => {
    if (!activeOrderId || cancellingHold) return false;
    setCancellingHold(true);
    try {
      const cancelled = await cancelHeldSeats(event.id, activeOrderId);
      if (cancelled) {
        setSecondsLeft(null);
        toast.success(language === 'en' ? 'Held seats cancelled' : 'Đã hủy giữ ghế');
      }
      return cancelled;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'en' ? 'Could not cancel held seats' : 'Không thể hủy giữ ghế'));
      return false;
    } finally {
      setCancellingHold(false);
    }
  };

  const handleBack = async () => {
    if (holdExpiry && activeOrderId) {
      const cancelled = await handleCancelHold();
      if (!cancelled) return;
    } else {
      clearUserSeats(event.id);
    }
    navigate(`/events/${event.id}`);
  };

  const totalAmount = userSeats.reduce((sum, seat) => sum + (getSeatZone(seat)?.price ?? 0), 0);
  const timerMin = secondsLeft === null ? 10 : Math.floor(secondsLeft / 60);
  const timerSec = secondsLeft === null ? 0 : secondsLeft % 60;
  const timerWarning = secondsLeft !== null && secondsLeft < 120;

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <header className="sticky top-16 z-30" style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="rounded-md p-2" style={{ background: '#F1F5F9', color: '#475569' }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: '#F97316' }}>{language === 'en' ? 'Seats' : 'Ghế'}</p>
              <h1 className="text-sm font-black md:text-base">{event.title}</h1>
            </div>
          </div>
          <div className="hidden text-sm md:block" style={{ color: '#64748B' }}>{formatDateTime(event.event_time)} • {event.location}</div>
          {holdExpiry && secondsLeft !== null && (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-black" style={{ background: timerWarning ? '#FEF2F2' : '#ECFDF5', color: timerWarning ? '#DC2626' : '#047857', border: `1px solid ${timerWarning ? '#FECACA' : '#A7F3D0'}` }}>
              <Clock size={15} />
              {String(timerMin).padStart(2, '0')}:{String(timerSec).padStart(2, '0')}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <section className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{language === 'en' ? 'Seat map' : 'Sơ đồ ghế'}</h2>
              <p className="text-sm" style={{ color: '#64748B' }}>{language === 'en' ? `Up to ${MAX_SELECT} seats per order` : `Tối đa ${MAX_SELECT} ghế mỗi đơn`}</p>
            </div>
            <span className="rounded-md px-3 py-1.5 text-sm font-black" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
              {language === 'en' ? 'Selected' : 'Đã chọn'} {selectedCount}/{MAX_SELECT}
            </span>
          </div>
          <SeatMap zones={zones} seats={seats} layouts={layouts} seatMapImageUrl={event.seat_map_image_url} onSeatClick={handleSeatClick} maxSelect={MAX_SELECT} />
        </section>

        <aside>
          <div className="sticky top-32 space-y-4">
            <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black">{language === 'en' ? 'Seat cart' : 'Giỏ ghế'}</h2>
                <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: '#F1F5F9', color: '#475569' }}>{userSeats.length}</span>
              </div>

              {userSeats.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingCart size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
                  <p className="text-sm" style={{ color: '#64748B' }}>{language === 'en' ? 'No seats selected' : 'Chưa chọn ghế'}</p>
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {userSeats.map(seat => {
                    const zone = getSeatZone(seat);
                    return (
                      <div key={seat.id} className="flex items-center justify-between gap-3 rounded-md p-3" style={{ background: seat.status === 'locked' ? '#FFFBEB' : '#FFF7ED', border: `1px solid ${seat.status === 'locked' ? '#FDE68A' : '#FED7AA'}` }}>
                        <div>
                          <div className="text-sm font-black">{makeSeatLabel(seat, zone, language)}</div>
                          <div className="text-xs font-bold" style={{ color: '#F97316' }}>{formatPrice(zone?.price ?? 0)} • {seat.status === 'locked' ? (language === 'en' ? 'Held' : 'Đã giữ') : (language === 'en' ? 'Selected' : 'Đang chọn')}</div>
                        </div>
                        {seat.status === 'selected' && (
                          <button onClick={() => deselectSeat(event.id, seat.id)} className="rounded-md p-1.5" style={{ background: '#fff', color: '#DC2626' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {userSeats.length > 0 && (
                <>
                  <div className="my-4 h-px" style={{ background: '#E2E8F0' }} />
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: '#64748B' }}>{language === 'en' ? 'Subtotal' : 'Tạm tính'}</span>
                    <span className="text-xl font-black" style={{ color: '#F97316' }}>{formatPrice(totalAmount)}</span>
                  </div>

                  {!holdExpiry && selectedCount > 0 ? (
                    <button onClick={handleHold} className="mb-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-black" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                      <Clock size={16} /> {language === 'en' ? 'Hold seats' : 'Giữ ghế'}
                    </button>
                  ) : holdExpiry ? (
                    <>
                      <div className="mb-2 flex items-center gap-2 rounded-md p-3 text-sm font-bold" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                        <CheckCircle2 size={16} /> {language === 'en' ? 'Seats are held' : 'Ghế đã được giữ'}
                      </div>
                      <button
                        onClick={handleCancelHold}
                        disabled={cancellingHold}
                        className="mb-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-black"
                        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', opacity: cancellingHold ? 0.72 : 1 }}
                      >
                        {cancellingHold ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <Trash2 size={16} />}
                        {language === 'en' ? 'Cancel hold' : 'Hủy giữ ghế'}
                      </button>
                    </>
                  ) : null}

                  <button
                    onClick={() => navigate('/checkout', { state: { eventId: event.id, orderId: activeOrderId } })}
                    disabled={!canCheckout || cancellingHold}
                    className="w-full rounded-md px-4 py-3 font-black text-white"
                    style={{
                      background: canCheckout && !cancellingHold ? '#F97316' : '#CBD5E1',
                      cursor: canCheckout && !cancellingHold ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {language === 'en' ? 'Checkout' : 'Thanh toán'}
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-3 rounded-lg p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-sm">{language === 'en' ? 'Seats are held only during the payment window. When it expires, seats become available again.' : 'Ghế chỉ được giữ trong thời hạn thanh toán. Khi hết hạn, ghế sẽ tự mở lại cho người khác chọn.'}</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
