import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Plus, LogOut, ReceiptText, ChevronRight, Languages, Moon, Sun } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { usePreferences } from '../../store/PreferencesContext';
import { BrandLogo } from '../../components/BrandLogo';

const NAV_ITEMS = [
  { path: '/admin', icon: LayoutDashboard, labelKey: 'dashboard' },
  { path: '/admin/events', icon: Calendar, labelKey: 'events' },
  { path: '/admin/events/new', icon: Plus, labelKey: 'createEvent' },
  { path: '/admin/orders', icon: ReceiptText, labelKey: 'orders' },
] as const;

export default function AdminLayout() {
  const { user, logout } = useApp();
  const { theme, toggleTheme, language, setLanguage, t } = usePreferences();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }} className="flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>{language === 'en' ? 'You do not have permission to access this page.' : 'Bạn không có quyền truy cập trang này.'}</p>
          <Link to="/login" className="mt-4 block"
            style={{ color: '#FF6B35', fontSize: '0.9rem' }}>{language === 'en' ? 'Login with an administrator account' : 'Đăng nhập với tài khoản quản trị'}</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff', display: 'flex' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0"
        style={{ background: '#0D0D1F', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Logo */}
        <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/admin" className="flex items-center gap-2">
            <BrandLogo size="sm" textClassName="text-base" />
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: '#fff' }}>{user.full_name}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('administrator')}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={path} to={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: isActive ? 'rgba(255,107,53,0.12)' : 'transparent',
                  color: isActive ? '#FF6B35' : 'rgba(255,255,255,0.55)',
                  border: isActive ? '1px solid rgba(255,107,53,0.2)' : '1px solid transparent',
                }}>
                <Icon size={16} />
                <span className="text-sm font-medium">{t(labelKey)}</span>
                {isActive && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.72)' }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? t('themeLight') : t('themeDark')}
            </button>
            <button
              type="button"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              className="inline-flex items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.72)' }}
            >
              <Languages size={14} />
              {language.toUpperCase()}
            </button>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all hover:bg-red-900/20"
            style={{ color: '#FF6B6B', fontSize: '0.85rem' }}>
            <LogOut size={15} /> {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
