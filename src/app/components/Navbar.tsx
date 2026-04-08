import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Zap, Ticket, User, LogOut, LayoutDashboard, Menu, X, ChevronDown } from 'lucide-react';
import { useApp } from '../store/AppContext';

export function Navbar() {
  const { user, logout } = useApp();
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
              <Zap size={16} className="text-white" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
              Ticket<span style={{ color: '#FF6B35' }}>Rush</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { path: '/', label: 'Trang chủ' },
              { path: '/events', label: 'Sự kiện' },
              ...(user ? [{ path: '/tickets', label: 'Vé của tôi' }] : []),
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
                <LayoutDashboard size={14} /> Admin
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name}</span>
                  <ChevronDown size={14} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden shadow-xl z-50"
                    style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Link to="/tickets" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                      <Ticket size={14} /> Vé của tôi
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                        style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                        <LayoutDashboard size={14} /> Admin Panel
                      </Link>
                    )}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 w-full text-left transition-colors"
                      style={{ color: '#FF6B6B', fontSize: '0.9rem' }}>
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login"
                  style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', padding: '6px 16px' }}
                  className="hover:text-white transition-colors">
                  Đăng nhập
                </Link>
                <Link to="/register"
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                  Đăng ký
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
            {[{ path: '/', label: 'Trang chủ' }, { path: '/events', label: 'Sự kiện' }].map(({ path, label }) => (
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
                Vé của tôi
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg"
                style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                Admin Panel
              </Link>
            )}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
            {user ? (
              <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-lg"
                style={{ color: '#FF6B6B', fontSize: '0.95rem' }}>
                Đăng xuất
              </button>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}>
                  Đăng nhập
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
