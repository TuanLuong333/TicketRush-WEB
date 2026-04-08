import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Zap, User, Mail, Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Vui lòng điền đầy đủ thông tin'); return; }
    if (form.password !== form.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    if (form.password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const ok = register(form.name, form.email, form.password);
    setLoading(false);
    if (ok) { toast.success('Đăng ký thành công!'); navigate('/'); }
  };

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
      className="flex items-center justify-center px-4 py-12">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
            <Zap size={28} className="text-white" />
          </div>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.6rem' }}>Tạo tài khoản</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Tham gia TicketRush ngay hôm nay
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'name', label: 'Họ và tên', icon: User, type: 'text', placeholder: 'Nguyễn Văn A' },
            { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'email@example.com' },
          ].map(({ key, label, icon: Icon, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</label>
              <div className="relative">
                <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => update(key as keyof typeof form, e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
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
          ))}

          {['password', 'confirm'].map((key, i) => (
            <div key={key}>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {i === 0 ? 'Mật khẩu' : 'Xác nhận mật khẩu'}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form[key as keyof typeof form]}
                  onChange={e => update(key as keyof typeof form, e.target.value)}
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
                {i === 0 && (
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center justify-center gap-2 mt-2"
            style={{
              background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(255,107,53,0.3)',
            }}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: '#FF6B35', fontWeight: 600 }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
