import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, Clock, KeyRound, RefreshCw, Timer, Users, Wifi } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatDateTime } from '../data/mockData';

export default function QueuePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEvent, currentQueueEntry, enterQueue, refreshQueueStatus, activateQueue, exitQueue, apiReady } = useApp();
  const event = getEvent(id ?? 0);
  const [position, setPosition] = useState(currentQueueEntry?.position_number ?? 50);
  const initialPosition = useMemo(() => Math.max(1, currentQueueEntry?.position_number ?? position), [currentQueueEntry?.position_number, position]);
  const [ready, setReady] = useState(currentQueueEntry?.status === 'active');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!event) return;
    if (!currentQueueEntry || currentQueueEntry.event_id !== event.id) {
      void enterQueue(event.id).then(entry => setPosition(entry.position_number));
    }
  }, [currentQueueEntry, enterQueue, event]);

  useEffect(() => {
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
        return;
      }
      setPosition(prev => {
        const next = Math.max(0, prev - (Math.floor(Math.random() * 4) + 2));
        if (next === 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          activateQueue();
          setReady(true);
        }
        return next;
      });
    }, 1600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activateQueue, apiReady, event, ready, refreshQueueStatus]);

  if (!event) {
    navigate('/events');
    return null;
  }

  const token = currentQueueEntry?.queue_token ?? 'Đang tạo';
  const progress = Math.min(100, Math.round(((initialPosition - position) / initialPosition) * 100));
  const expired = currentQueueEntry?.expires_at ? new Date(currentQueueEntry.expires_at).getTime() < Date.now() : false;

  const enterSeatMap = () => {
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
        {ready ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <Timer size={44} />
            </div>
            <h1 className="text-3xl font-black">Đến lượt bạn</h1>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>Token có hiệu lực trong 5 phút để vào chọn ghế.</p>
            <div className="my-6 rounded-lg p-4 text-left" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="mb-4 flex items-center gap-3">
                <img src={event.banner_url} alt={event.title} className="h-16 w-16 rounded-md object-cover" />
                <div>
                  <h2 className="font-black">{event.title}</h2>
                  <p className="text-sm" style={{ color: '#64748B' }}>{formatDateTime(event.event_time)} • {event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md p-3 font-mono text-sm" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                <KeyRound size={16} /> {token}
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
              <div className="mb-4 flex items-center justify-center gap-2 rounded-md p-3 font-mono text-sm" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                <KeyRound size={16} /> {token}
              </div>
              <p className="text-sm font-bold" style={{ color: '#64748B' }}>Vị trí còn lại</p>
              <div className="my-2 text-7xl font-black" style={{ color: '#F97316' }}>{position}</div>
              <div className="mb-6 text-sm" style={{ color: '#64748B' }}>Ước tính {Math.max(1, Math.ceil(position / 18))} phút</div>
              <div className="mb-5 h-3 overflow-hidden rounded-full" style={{ background: '#E2E8F0' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#0EA5E9,#F97316)' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Đang chờ', value: `~${position + 120}`, icon: Users },
                  { label: 'Lượt', value: '30', icon: Timer },
                  { label: 'Trạng thái', value: 'Trực tiếp', icon: Wifi },
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
