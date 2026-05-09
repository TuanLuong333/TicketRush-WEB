import { useNavigate } from 'react-router';
import { LogOut, Mail, Phone, User } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatPrice } from '../data/mockData';

export default function ProfilePage() {
  const { user, logout, orders, orderItems } = useApp();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const userOrders = orders.filter(order => order.user_id === user.id);
  const userOrderIds = new Set(userOrders.map(order => order.id));
  const ticketCount = orderItems.filter(item => userOrderIds.has(item.order_id)).length;
  const paidTotal = userOrders.reduce((sum, order) => sum + order.total_amount, 0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <section style={{ background: '#0F172A', color: '#fff' }}>
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-5">
              <div className="flex h-28 w-28 items-center justify-center rounded-lg text-4xl font-black" style={{ background: 'linear-gradient(135deg,#0EA5E9,#F97316)' }}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="mb-2 w-fit rounded-md px-2 py-1 text-xs font-black uppercase" style={{ background: 'rgba(249,115,22,0.18)', color: '#FDBA74' }}>{user.role}</p>
                <h1 className="break-words text-3xl font-black">{user.full_name}</h1>
                <p className="mt-1 break-all text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_300px] lg:px-8">
        <section className="rounded-lg p-6" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <h2 className="mb-6 flex items-center gap-2 text-xl font-black"><User size={20} style={{ color: '#F97316' }} /> Thông tin tài khoản</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-bold" style={{ color: '#64748B' }}>Họ và tên</label>
              <p className="break-words font-bold">{user.full_name}</p>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-bold" style={{ color: '#64748B' }}>Email</label>
              <p className="flex min-w-0 items-start gap-2 break-all font-bold"><Mail size={16} className="mt-1 shrink-0" /> {user.email}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold" style={{ color: '#64748B' }}>Số điện thoại</label>
              <p className="flex items-center gap-2 font-bold"><Phone size={16} /> {user.phone || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold" style={{ color: '#64748B' }}>Ngày sinh</label>
              <p className="font-bold">{user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold" style={{ color: '#64748B' }}>Giới tính</label>
              <p className="font-bold">{user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold" style={{ color: '#64748B' }}>User ID</label>
              <p className="font-mono font-bold">#{user.id}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <h2 className="mb-4 font-black">Hoạt động</h2>
            <div className="space-y-3">
              <div className="flex justify-between rounded-md p-3" style={{ background: '#F8FAFC' }}><span style={{ color: '#64748B' }}>Đơn hàng</span><b>{userOrders.length}</b></div>
              <div className="flex justify-between rounded-md p-3" style={{ background: '#F8FAFC' }}><span style={{ color: '#64748B' }}>Vé</span><b>{ticketCount}</b></div>
              <div className="flex justify-between rounded-md p-3" style={{ background: '#F8FAFC' }}><span style={{ color: '#64748B' }}>Tổng chi</span><b>{formatPrice(paidTotal)}</b></div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-black" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            <LogOut size={18} /> Đăng xuất
          </button>
        </aside>
      </div>
    </main>
  );
}
