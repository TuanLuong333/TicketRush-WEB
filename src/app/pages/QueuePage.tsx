import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Users, RefreshCw, Zap, Clock, ArrowRight, Wifi, Key } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function QueuePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEvent, queueActive, queuePosition, queueToken, queueEntry, enterQueue, exitQueue } = useApp();

  const event = getEvent(eventId ?? '');
  const [position, setPosition] = useState(queuePosition || Math.floor(Math.random() * 80) + 40);
  const [initialPosition] = useState(position);
  const [isReady, setIsReady] = useState(false);
  const [dots, setDots] = useState('');
  const [estimatedWait, setEstimatedWait] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check queue_entries.expires_at from entry
  const expiresAt = queueEntry?.expires_at ? new Date(queueEntry.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;

  // Initialize queue entry
  useEffect(() => {
    if (eventId && !queueActive) {
      enterQueue(eventId);
    }
  }, []);

  // Count down position
  useEffect(() => {
    setEstimatedWait(Math.ceil(position * 3 / 60));

    intervalRef.current = setInterval(() => {
      setPosition(prev => {
        const decrement = Math.floor(Math.random() * 3) + 1;
        const next = Math.max(0, prev - decrement);
        setEstimatedWait(Math.ceil(next * 3 / 60));
        if (next === 0) {
          clearInterval(intervalRef.current!);
          setIsReady(true);
        }
        return next;
      });
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleEnter = () => {
    exitQueue();
    navigate(`/events/${eventId}/seats`);
  };

  const progress = Math.max(0, Math.min(100, ((initialPosition - position) / initialPosition) * 100));

  if (!event) { navigate('/'); return null; }

  if (isExpired) {
    return (
      <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
        className="flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Clock size={36} style={{ color: '#EF4444' }} />
          </div>
          <h2 className="mb-2" style={{ color: '#EF4444', fontWeight: 700 }}>Hết hạn hàng chờ</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Token của bạn đã hết hạn. Vui lòng tham gia lại hàng chờ.
          </p>
          <button onClick={() => { exitQueue(); navigate(`/events/${eventId}`); }}
            className="px-6 py-2.5 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
            Quay lại sự kiện
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
      className="flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {isReady ? (
          // READY STATE
          <div className="text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
              <Zap size={40} className="text-white" />
            </div>
            <h1 className="mb-2" style={{ color: '#10B981', fontWeight: 800, fontSize: '2rem' }}>
              Đến lượt bạn rồi!
            </h1>
            <p className="mb-4 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Bạn có <strong style={{ color: '#FF6B35' }}>5 phút</strong> để tiến vào chọn ghế trước khi mất lượt.
            </p>

            {/* Token display */}
            {queueToken && (
              <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Key size={14} style={{ color: '#10B981' }} />
                <span className="text-xs font-mono" style={{ color: '#10B981' }}>Token: {queueToken}</span>
              </div>
            )}

            <div className="p-5 rounded-2xl mb-8 flex items-center gap-4"
              style={{ background: '#12122A', border: '1px solid rgba(16,185,129,0.2)' }}>
              <img src={event.banner_url} alt={event.title}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="text-left">
                <div className="text-xs mb-0.5" style={{ color: '#FF6B35' }}>{event.artist}</div>
                <div className="font-bold" style={{ color: '#fff' }}>{event.title}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {event.venue} • {event.city}
                </div>
              </div>
            </div>

            <button onClick={handleEnter}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: '0 8px 30px rgba(16,185,129,0.4)',
              }}>
              Vào chọn ghế ngay <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          // WAITING STATE
          <div>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-bold"
                style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}>
                <Wifi size={12} /> Phòng Chờ Ảo
              </div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1.2 }}>
                Hàng chờ {event.title}
              </h1>
              <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {event.artist} • {event.venue}
              </p>
            </div>

            {/* Token display */}
            {queueToken && (
              <div className="flex items-center justify-center gap-2 mb-4 p-2.5 rounded-xl"
                style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.15)' }}>
                <Key size={12} style={{ color: '#FF6B35' }} />
                <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Token: <span style={{ color: '#FF6B35', fontWeight: 700 }}>{queueToken}</span>
                </span>
              </div>
            )}

            {/* Main Queue Card */}
            <div className="p-8 rounded-2xl mb-6 text-center"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Position display */}
              <div className="mb-2">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Vị trí của bạn</p>
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span style={{
                  fontSize: '5rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {position.toLocaleString()}
                </span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                trong hàng đợi
              </p>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span>Tiến trình</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #FF6B35, #FF3A8C)',
                      boxShadow: '0 0 10px rgba(255,107,53,0.5)',
                    }} />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Users, label: 'Trong hàng',   value: `~${(position * 2 + 20).toLocaleString()}` },
                  { icon: Clock, label: 'Ước tính',      value: estimatedWait <= 0 ? '<1 phút' : `~${estimatedWait} phút` },
                  { icon: Zap,   label: 'Mỗi lượt',      value: '50 người' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Icon size={16} className="mx-auto mb-1" style={{ color: '#FF6B35' }} />
                    <div className="text-xs font-bold" style={{ color: '#fff' }}>{value}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning notice */}
            <div className="p-4 rounded-xl mb-6 flex items-start gap-3"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <RefreshCw size={16} style={{ color: '#F59E0B', marginTop: 1, flexShrink: 0 }} />
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="font-semibold" style={{ color: '#F59E0B' }}>Vui lòng không tải lại trang!</span>
                <span className="ml-1">Bạn sẽ mất vị trí trong hàng đợi nếu rời trang.</span>
              </div>
            </div>

            {/* Animated dots */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: '#FF6B35',
                        animationDelay: `${i * 0.2}s`,
                        opacity: 0.6,
                      }} />
                  ))}
                </div>
                Đang xử lý hàng đợi{dots}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
