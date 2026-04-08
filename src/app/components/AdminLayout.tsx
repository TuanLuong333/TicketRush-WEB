import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, CalendarDays, Users, BarChart3, Settings,
  Ticket, LogOut, ChevronRight, Menu, X, TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: CalendarDays, label: 'Quản lý sự kiện', to: '/admin/events' },
  { icon: TrendingUp, label: 'Doanh thu', to: '/admin/dashboard' },
  { icon: Users, label: 'Khán giả', to: '/admin/dashboard' },
  { icon: Settings, label: 'Cài đặt', to: '/admin/dashboard' },
];

export function AdminLayout() {
  const { user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-[#0b0b14] flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 transition-all duration-300 bg-[#111120] border-r border-white/10 flex flex-col fixed h-full z-40`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-white overflow-hidden whitespace-nowrap" style={{ fontSize: '1rem', fontWeight: 700 }}>
              Ticket<span className="text-violet-400">Rush</span>
              <span className="ml-1.5 text-xs text-slate-500 align-middle">Admin</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.to || (item.to !== '/admin/dashboard' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
                {sidebarOpen && (
                  <span className="text-sm whitespace-nowrap overflow-hidden" style={{ fontWeight: isActive ? 600 : 400 }}>
                    {item.label}
                  </span>
                )}
                {sidebarOpen && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-white/10">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all text-sm mb-0.5">
            <Ticket className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && 'Xem trang chủ'}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && 'Đăng xuất'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col min-h-screen ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300`}>
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#111120]/50 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-slate-500">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-300">
                {location.pathname.includes('/events') ? 'Quản lý sự kiện' : 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 text-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>
                {user?.avatar}
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-sm" style={{ fontWeight: 600 }}>{user?.name}</p>
                <p className="text-slate-500 text-xs">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
