import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Zap, User, Mail, Lock, Phone, Calendar } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { toast } from 'sonner';
import type { UserGender } from '../data/types';

export default function RegisterPage() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    full_name: '', 
    email: '', 
    phone: '',
    gender: 'other' as UserGender,
    birth_date: '',
    password: '', 
    confirm: '' 
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.phone || !form.birth_date) { 
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); 
      return; 
    }
    if (form.password !== form.confirm) { 
      toast.error('Mật khẩu xác nhận không khớp'); 
      return; 
    }
    if (form.password.length < 6) { 
      toast.error('Mật khẩu phải có ít nhất 6 ký tự'); 
      return; 
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate API delay
    
    const ok = register({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      gender: form.gender,
      birth_date: form.birth_date,
      password: form.password
    });

    setLoading(false);
    if (ok) { 
      toast.success('Đăng ký tài khoản thành công!'); 
      navigate('/'); 
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  };

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
      className="flex items-center justify-center px-4 py-8">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-lg relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#fff' }}>Bắt đầu ngay</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Tạo tài khoản để trải nghiệm những sự kiện đỉnh cao
          </p>
        </div>

        <div className="rounded-3xl p-6 md:p-8" 
          style={{ background: 'rgba(18,18,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Họ và tên</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
                    placeholder="Nguyễn Văn A" className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:border-[#FF6B35]/50" 
                    style={inputStyle} />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                    placeholder="email@example.com" className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:border-[#FF6B35]/50" 
                    style={inputStyle} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Số điện thoại</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                    placeholder="09xx xxx xxx" className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:border-[#FF6B35]/50" 
                    style={inputStyle} />
                </div>
              </div>

              {/* Birth Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Ngày sinh</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input type="date" value={form.birth_date} onChange={e => update('birth_date', e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:border-[#FF6B35]/50" 
                    style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Giới tính</label>
              <div className="flex gap-3">
                {(['male', 'female', 'other'] as const).map(g => (
                  <button key={g} type="button" onClick={() => update('gender', g)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                    style={{
                      background: form.gender === g ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)',
                      borderColor: form.gender === g ? '#FF6B35' : 'rgba(255,255,255,0.08)',
                      color: form.gender === g ? '#FF6B35' : 'rgba(255,255,255,0.4)',
                    }}>
                    {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Mật khẩu</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                    placeholder="••••••••" className="w-full pl-9 pr-10 py-3 rounded-xl text-sm outline-none transition-all focus:border-[#FF6B35]/50" 
                    style={inputStyle} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Xác nhận</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                  <input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={e => update('confirm', e.target.value)}
                    placeholder="••••••••" className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:border-[#FF6B35]/50" 
                    style={inputStyle} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-[#FF6B35]/20"
              style={{
                background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
                opacity: loading ? 0.7 : 1
              }}>
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Đăng ký tài khoản'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" className="transition-colors hover:text-[#FF3A8C]" style={{ color: '#FF6B35', fontWeight: 700 }}>Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  );
}
