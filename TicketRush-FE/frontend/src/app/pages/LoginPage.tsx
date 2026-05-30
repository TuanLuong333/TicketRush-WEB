import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Languages, Lock, Mail, Moon, Sun } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { toast } from 'sonner';
import { BrandLogo } from '../components/BrandLogo';

export default function LoginPage() {
  const { login } = useApp();
  const { theme, toggleTheme, language, setLanguage, t } = usePreferences();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(language === 'en' ? 'Please enter email and password' : 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      const signedInUser = await login(email, password);
      if (signedInUser) {
        toast.success(language === 'en' ? 'Signed in successfully' : 'Đăng nhập thành công!');
        navigate(signedInUser.role === 'admin' ? '/admin' : '/');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'en' ? 'Sign in failed' : 'Đăng nhập thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
      className="flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
          title={theme === 'dark' ? t('themeLight') : t('themeDark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          type="button"
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-bold"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Languages size={15} />
          {language.toUpperCase()}
        </button>
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo size="lg" showText={false} className="mb-4 justify-center" />
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.6rem' }}>{t('login')}</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {language === 'en' ? 'Welcome back to TicketRush' : 'Chào mừng trở lại TicketRush'}
          </p>
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
                autoComplete="username"
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
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{language === 'en' ? 'Password' : 'Mật khẩu'}</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
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
            ) : t('login')}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {language === 'en' ? 'No account yet?' : 'Chưa có tài khoản?'}{' '}
          <Link to="/register" style={{ color: '#FF6B35', fontWeight: 600 }}>{language === 'en' ? 'Sign up now' : 'Đăng ký ngay'}</Link>
        </p>
      </div>
    </div>
  );
}
