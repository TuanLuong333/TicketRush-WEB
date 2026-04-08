import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Plus, LogOut, Zap, BarChart2, Users, Settings, ChevronRight } from 'lucide-react';
import { useApp } from '../../store/AppContext';

const NAV_ITEMS = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/events', icon: Calendar, label: 'Sự kiện' },
  { path: '/admin/events/new', icon: Plus, label: 'Tạo sự kiện' },
];

export default function AdminLayout() {
  const { user, logout } = useApp();
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
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Bạn không có quyền truy cập trang này.</p>
          <Link to="/login" className="mt-4 block"
            style={{ color: '#FF6B35', fontSize: '0.9rem' }}>Đăng nhập với tài khoản Admin</Link>
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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
              <Zap size={15} className="text-white" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
              Ticket<span style={{ color: '#FF6B35' }}>Rush</span>
            </span>
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: '#fff' }}>{user.name}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Administrator</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
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
                <span className="text-sm font-medium">{label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5 mb-1"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            <Zap size={15} /> Về trang khách hàng
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all hover:bg-red-900/20"
            style={{ color: '#FF6B6B', fontSize: '0.85rem' }}>
            <LogOut size={15} /> Đăng xuất
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
