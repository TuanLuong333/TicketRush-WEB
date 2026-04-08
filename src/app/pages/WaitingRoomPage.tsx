import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Users, Zap, AlertCircle, RefreshCcw, ArrowRight, Wifi } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export function WaitingRoomPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(Math.floor(Math.random() * 200) + 80);
  const [totalInQueue, setTotalInQueue] = useState(Math.floor(Math.random() * 500) + 400);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'entering'>('waiting');
  const [dots, setDots] = useState('.');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Simulate queue movement
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(prev => {
        if (prev <= 1) {
          setPhase('entering');
          return 0;
        }
        const decrease = Math.floor(Math.random() * 5) + 1;
        return Math.max(1, prev - decrease);
      });
      setTotalInQueue(prev => Math.max(prev - Math.floor(Math.random() * 8), 0));
      setLastUpdated(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Progress bar
  useEffect(() => {
    const originalPosition = position + 50;
    setProgress(Math.min(100, ((originalPosition - position) / originalPosition) * 100));
  }, [position]);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '.' : prev + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Estimate wait time (3 seconds per person, 50 per batch)
  const batchesAhead = Math.ceil(position / 50);
  const estimatedSeconds = batchesAhead * 50 * 3;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (phase === 'entering') {
    return (
      <div className="min-h-screen bg-[#0b0b14]">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-400/10 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Zap className="w-12 h-12 text-emerald-400" />
            </div>
            <h1 className="text-white mb-2" style={{ fontWeight: 800, fontSize: '2rem' }}>Đến lượt bạn rồi!</h1>
            <p className="text-emerald-400 mb-8" style={{ fontWeight: 600 }}>Bạn đã được phép truy cập đặt vé.</p>
            <button
              onClick={() => navigate('/events/1')}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white flex items-center justify-center gap-2 transition-all shadow-2xl shadow-emerald-500/30"
              style={{ fontWeight: 700, fontSize: '1rem' }}
            >
              Vào trang chọn ghế ngay
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b14]">
      <Navbar />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
        <div className="max-w-lg w-full">
          {/* Animated icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-violet-600/10 border-2 border-violet-600/30 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-violet-600/20 border-2 border-violet-500/40 flex items-center justify-center animate-pulse">
                  <Users className="w-10 h-10 text-violet-400" />
                </div>
              </div>
              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                <div className="absolute top-1 left-1/2 w-2.5 h-2.5 rounded-full bg-violet-500 -translate-x-1/2" />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="bg-[#14141f] rounded-3xl border border-white/10 p-8 text-center mb-4">
            <p className="text-slate-400 text-sm mb-2">Vị trí của bạn trong hàng chờ</p>
            <div className="flex items-end justify-center gap-2 mb-1">
              <span
                className="text-violet-400"
                style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, fontFamily: 'monospace' }}
              >
                {position.toString().padStart(3, '0')}
              </span>
            </div>
            <p className="text-slate-400 mb-6">
              trong tổng số <span className="text-white" style={{ fontWeight: 600 }}>{totalInQueue.toLocaleString('vi-VN')}</span> người đang chờ
            </p>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Tiến độ hàng chờ</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-500 to-violet-400 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatBox
                icon={<Clock className="w-4 h-4" />}
                label="Thời gian ước tính"
                value={`~${estimatedMinutes} phút`}
                color="text-amber-400"
              />
              <StatBox
                icon={<Users className="w-4 h-4" />}
                label="Mỗi lượt vào"
                value="50 người"
                color="text-violet-400"
              />
              <StatBox
                icon={<Zap className="w-4 h-4" />}
                label="Lượt chờ còn"
                value={`${batchesAhead} lượt`}
                color="text-cyan-400"
              />
            </div>

            {/* Live indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Kết nối</span>
                <span>·</span>
                <span>Cập nhật mỗi 3 giây</span>
                <span className="font-mono">{dots}</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm" style={{ fontWeight: 700 }}>Vui lòng không tải lại trang!</p>
                <p className="text-amber-300/70 text-xs mt-1">
                  Nếu bạn rời trang, bạn sẽ mất vị trí trong hàng chờ và phải xếp hàng lại từ đầu.
                  Hệ thống sẽ tự động chuyển bạn khi đến lượt.
                </p>
              </div>
            </div>
          </div>

          {/* Last updated */}
          <div className="text-center text-xs text-slate-600">
            Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')}
          </div>

          {/* Queue visualization */}
          <div className="mt-6 bg-[#14141f] rounded-2xl border border-white/10 p-4">
            <p className="text-slate-400 text-xs mb-3 text-center">Trực quan hoá hàng chờ</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {Array.from({ length: Math.min(100, totalInQueue) }, (_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < Math.min(50, position)
                      ? 'bg-violet-500/30'
                      : i === Math.min(50, position)
                      ? 'bg-violet-400 scale-150 ring-2 ring-violet-400/30'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
              {totalInQueue > 100 && (
                <span className="text-slate-600 text-xs self-center ml-1">+{totalInQueue - 100}</span>
              )}
            </div>
            <p className="text-center text-xs text-slate-600 mt-2">
              <span className="inline-block w-2.5 h-2.5 bg-violet-400 rounded-full mr-1" />
              Vị trí của bạn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <p className={`text-sm mb-0.5 ${color}`} style={{ fontWeight: 700 }}>{value}</p>
      <p className="text-slate-600 text-[10px]">{label}</p>
    </div>
  );
}
