import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, Clock, RefreshCw, Timer, Users, Wifi } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatDateTime, getQueueThreshold } from '../data/mockData';
import { QUEUE_FEATURE_ENABLED, getQueueStatusLabel } from '../data/types';

export default function QueuePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEvent, currentQueueEntry, enterQueue, refreshQueueStatus, activateQueue, exitQueue, apiReady, apiLoading, getQueueLoad, user } = useApp();
  const event = getEvent(id ?? 0);
  const [position, setPosition] = useState(currentQueueEntry?.position_number ?? 50);
  const initialPosition = useMemo(() => Math.max(1, currentQueueEntry?.position_number ?? position), [currentQueueEntry?.position_number, position]);
  const [ready, setReady] = useState(currentQueueEntry?.status === 'active');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leavingForSeatMapRef = useRef(false);
  const pageUnloadingRef = useRef(false);
  const queueExitRef = useRef<{ eventId: number | null; shouldLeave: boolean }>({ eventId: null, shouldLeave: false });

  useEffect(() => {
    // Queue code is temporarily disabled by QUEUE_FEATURE_ENABLED.
    if (!QUEUE_FEATURE_ENABLED && event) navigate(`/events/${event.id}/seats`, { replace: true });
  }, [event, navigate]);

  useEffect(() => {
    queueExitRef.current = {
      eventId: event?.id ?? null,
      shouldLeave: Boolean(
        event &&
        currentQueueEntry?.event_id === event.id &&
        currentQueueEntry.status === 'waiting'
      ),
    };
  }, [currentQueueEntry, event]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      pageUnloadingRef.current = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    return () => {
      const { eventId, shouldLeave } = queueExitRef.current;
      if (!eventId || !shouldLeave || leavingForSeatMapRef.current || pageUnloadingRef.current) return;
      void exitQueue(eventId);
    };
  }, [exitQueue]);

  useEffect(() => {
    if (!QUEUE_FEATURE_ENABLED) return;
    if (!event) return;
    if (apiReady && !user) return;
    if (!currentQueueEntry || currentQueueEntry.event_id !== event.id) {
      void enterQueue(event.id).then(entry => setPosition(entry.position_number));
    }
  }, [apiReady, currentQueueEntry, enterQueue, event, user]);

  useEffect(() => {
    if (!QUEUE_FEATURE_ENABLED) return;
    if (ready) return;
    intervalRef.current = setInterval(() => {
      if (apiReady && event) {
        void refreshQueueStatus(event.id).then(entry => {
          if (entry?.status === 'active') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPosition(0);
            setReady(true);
          } else if (entry) {
            setPosition(entry.position_number || 1);
          }
        });
      }
    }, 1600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [apiReady, event, ready, refreshQueueStatus]);

  const queueLoad = event ? getQueueLoad(event.id) : { activeVisitors: 0, activeQueueEntries: 0 };
  const queueThreshold = event ? getQueueThreshold(event) ?? 0 : 0;
  const activeSeatVisitors = Math.max(0, Number(queueLoad.activeVisitors || 0));
  const peopleAhead = Math.max(0, currentQueueEntry?.people_ahead ?? Math.max(position - 1, 0));
  const seatSlotWait = queueThreshold > 0 ? Math.max(activeSeatVisitors - queueThreshold + 1, 0) : 0;
  const livePosition = ready ? 0 : Math.max(0, peopleAhead + seatSlotWait);
  const canEnterSeatMap = Boolean(event && currentQueueEntry) && (
    ready ||
    currentQueueEntry?.can_enter ||
    currentQueueEntry?.status === 'active' ||
    (peopleAhead === 0 && queueThreshold > 0 && activeSeatVisitors < queueThreshold)
  );
  const statusLabel = currentQueueEntry ? getQueueStatusLabel(currentQueueEntry.status) : 'Đang tạo';
  const progress = Math.min(100, Math.max(0, Math.round(((initialPosition - livePosition) / initialPosition) * 100)));
  const expired = currentQueueEntry?.expires_at ? new Date(currentQueueEntry.expires_at).getTime() < Date.now() : false;

  useEffect(() => {
    if (!QUEUE_FEATURE_ENABLED) return;
    if (!event || ready || !canEnterSeatMap) return;
    if (!apiReady) activateQueue();
    setPosition(0);
    setReady(true);
  }, [activateQueue, apiReady, canEnterSeatMap, event, ready]);

  if (!event) {
    if (apiLoading) {
      return (
        <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#F8FAFC', color: '#0F172A' }}>
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
            <p className="font-bold">Đang tải hàng chờ...</p>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#F8FAFC', color: '#0F172A' }}>
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-black">Không tìm thấy sự kiện</h1>
          <Link to="/events" className="mt-5 inline-flex rounded-md px-5 py-3 font-black text-white" style={{ background: '#F97316' }}>
            Về danh sách sự kiện
          </Link>
        </div>
      </main>
    );
  }

  const enterSeatMap = () => {
    leavingForSeatMapRef.current = true;
    void exitQueue(event.id);
    navigate(`/events/${event.id}/seats`);
  };

  if (expired) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#F8FAFC', color: '#0F172A' }}>
        <div className="max-w-sm text-center">
          <Clock size={54} className="mx-auto mb-4" style={{ color: '#DC2626' }} />
          <h1 className="text-2xl font-black">Token hết hạn</h1>
          <p className="mt-2 text-sm" style={{ color: '#64748B' }}>Vui lòng vào lại hàng chờ để nhận mã mới.</p>
          <button onClick={() => navigate(`/events/${event.id}`)} className="mt-5 rounded-md px-5 py-3 font-black text-white" style={{ background: '#F97316' }}>
            Quay lại sự kiện
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10" style={{ background: '#F8FAFC', color: '#0F172A' }}>
      <div className="w-full max-w-xl">
        {canEnterSeatMap ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <Timer size={44} />
            </div>
            <h1 className="text-3xl font-black">Đến lượt bạn</h1>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>Lượt vào chọn ghế có hiệu lực trong 5 phút.</p>
            <div className="my-6 rounded-lg p-4 text-left" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-3">
                <img src={event.banner_url} alt={event.title} className="h-16 w-16 rounded-md object-cover" />
                <div>
                  <h2 className="font-black">{event.title}</h2>
                  <p className="text-sm" style={{ color: '#64748B' }}>{formatDateTime(event.event_time)} • {event.location}</p>
                </div>
              </div>
            </div>
            <button onClick={enterSeatMap} className="flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-lg font-black text-white" style={{ background: '#16A34A' }}>
              Vào chọn ghế <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-7 text-center">
              <span className="mb-4 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-black uppercase" style={{ background: '#E0F2FE', color: '#075985' }}>
                <Wifi size={13} /> Hàng chờ trực tuyến
              </span>
              <h1 className="text-3xl font-black">Hàng chờ {event.title}</h1>
              <p className="mt-2 text-sm" style={{ color: '#64748B' }}>{event.location}</p>
            </div>

            <div className="rounded-lg p-7 text-center" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 22px 60px rgba(15,23,42,0.08)' }}>
              <p className="text-sm font-bold" style={{ color: '#64748B' }}>Vị trí còn lại</p>
              <div className="my-2 text-7xl font-black" style={{ color: '#F97316' }}>{livePosition}</div>
              <div className="mb-6 text-sm" style={{ color: '#64748B' }}>Ước tính {Math.max(1, Math.ceil(Math.max(livePosition, 1) / 18))} phút</div>
              <div className="mb-5 h-3 overflow-hidden rounded-full" style={{ background: '#E2E8F0' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#0EA5E9,#F97316)' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Trước bạn', value: peopleAhead.toLocaleString(), icon: Users },
                  { label: 'Vị trí', value: livePosition.toLocaleString(), icon: Timer },
                  { label: 'Trạng thái', value: statusLabel, icon: Wifi },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-md p-3" style={{ background: '#F8FAFC' }}>
                    <Icon size={17} className="mx-auto mb-1" style={{ color: '#F97316' }} />
                    <div className="text-sm font-black">{value}</div>
                    <div className="text-xs" style={{ color: '#64748B' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-3 rounded-lg p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
              <RefreshCw size={18} className="shrink-0" />
              <p className="text-sm">Giữ nguyên trang để không mất vị trí hàng chờ hiện tại.</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
