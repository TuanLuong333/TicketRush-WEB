import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Ticket, User, LogOut, LayoutDashboard, Menu, X, ChevronDown, Languages, Moon, Sun } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { BrandLogo } from './BrandLogo';

export function Navbar() {
  const { user, logout } = useApp();
  const { theme, toggleTheme, language, setLanguage, t } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav style={{ background: 'rgba(8,8,26,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      className="sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <BrandLogo size="sm" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { path: '/', label: t('home') },
              { path: '/events', label: t('events') },
              ...(user ? [{ path: '/tickets', label: t('myTickets') }] : []),
            ].map(({ path, label }) => (
              <Link key={path} to={path}
                style={{
                  color: isActive(path) ? '#FF6B35' : 'rgba(255,255,255,0.7)',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  background: isActive(path) ? 'rgba(255,107,53,0.1)' : 'transparent',
                }}
                className="hover:text-white">
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link to="/admin"
                style={{
                  color: isActive('/admin') ? '#FF6B35' : 'rgba(255,255,255,0.7)',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  background: isActive('/admin') ? 'rgba(255,107,53,0.1)' : 'transparent',
                }}
                className="hover:text-white flex items-center gap-1">
                <LayoutDashboard size={14} /> {t('admin')}
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.12)' }}
              aria-label={theme === 'dark' ? t('themeLight') : t('themeDark')}
              title={theme === 'dark' ? t('themeLight') : t('themeDark')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-bold transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.12)' }}
              aria-label={language === 'vi' ? t('languageEn') : t('languageVi')}
              title={language === 'vi' ? t('languageEn') : t('languageVi')}
            >
              <Languages size={15} />
              {language.toUpperCase()}
            </button>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.full_name}</span>
                  <ChevronDown size={14} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden shadow-xl z-50"
                    style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Link to="/profile" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                      <User size={14} /> {t('profile')}
                    </Link>
                    <Link to="/tickets" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                      <Ticket size={14} /> {t('myTickets')}
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                        style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                        <LayoutDashboard size={14} /> {t('adminPanel')}
                      </Link>
                    )}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 w-full text-left transition-colors"
                      style={{ color: '#FF6B6B', fontSize: '0.9rem' }}>
                      <LogOut size={14} /> {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login"
                  style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', padding: '6px 16px' }}
                  className="hover:text-white transition-colors">
                  {t('login')}
                </Link>
                <Link to="/register"
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                  {t('register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2"
            style={{ color: '#fff' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="pt-3 space-y-1">
            {[{ path: '/', label: t('home') }, { path: '/events', label: t('events') }].map(({ path, label }) => (
              <Link key={path} to={path} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg"
                style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                {label}
              </Link>
            ))}
            {user && (
              <Link to="/tickets" onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg"
                style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                {t('myTickets')}
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg"
                style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                {t('adminPanel')}
              </Link>
            )}
            <div className="flex gap-2 px-3 py-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                {theme === 'dark' ? t('themeLight') : t('themeDark')}
              </button>
              <button
                type="button"
                onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
              >
                <Languages size={15} />
                {language.toUpperCase()}
              </button>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
            {user ? (
              <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-lg"
                style={{ color: '#FF6B6B', fontSize: '0.95rem' }}>
                {t('logout')}
              </button>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}>
                  {t('login')}
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                  {t('register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
