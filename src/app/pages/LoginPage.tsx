import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Zap, Lock, Mail } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Vui lòng nhập đầy đủ thông tin'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const ok = login(email, password);
    setLoading(false);
    if (ok) {
      toast.success('Đăng nhập thành công!');
      navigate(email.includes('admin') ? '/admin' : '/');
    }
  };

  const quickLogin = async (type: 'admin' | 'user') => {
    const creds = type === 'admin'
      ? { e: 'admin@ticketrush.vn', p: 'Admin@2026' }
      : { e: 'user@ticketrush.vn', p: 'User@2026' };
    setEmail(creds.e);
    setPassword(creds.p);
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    login(creds.e, creds.p);
    setLoading(false);
    toast.success('Đăng nhập thành công!');
    navigate(type === 'admin' ? '/admin' : '/');
  };

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
      className="flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
            <Zap size={28} className="text-white" />
          </div>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.6rem' }}>Đăng nhập</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Chào mừng trở lại TicketRush
          </p>
        </div>

        {/* Quick login */}
        <div className="p-4 rounded-xl mb-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs mb-3 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Demo nhanh</p>
          <div className="flex gap-2">
            <button onClick={() => quickLogin('user')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#60A5FA' }}>
              👤 Khán giả
            </button>
            <button onClick={() => quickLogin('admin')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}>
              🛡️ Admin
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#FF6B35'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Mật khẩu</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#FF6B35'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center justify-center gap-2 mt-2"
            style={{
              background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(255,107,53,0.3)',
            }}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: '#FF6B35', fontWeight: 600 }}>Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
