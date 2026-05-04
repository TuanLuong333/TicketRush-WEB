import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Mail, Camera, Edit3, Save, X, LogOut, ChevronRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { toast } from 'sonner';
import type { UserGender } from '../data/types';

export default function ProfilePage() {
  const { user, updateUser, logout } = useApp();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || 'other' as UserGender,
    birth_date: user?.birth_date || '',
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSave = () => {
    if (!form.full_name || !form.email) {
      toast.error('Họ tên và Email không được để trống');
      return;
    }
    updateUser(form);
    setIsEditing(false);
    toast.success('Cập nhật thông tin thành công!');
  };

  const handleCancel = () => {
    setForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      gender: user.gender || 'other',
      birth_date: user.birth_date || '',
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Đã đăng xuất');
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  };

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }} className="pb-20">
      {/* Header Profile Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0" 
          style={{ background: 'linear-gradient(135deg, #12122A 0%, #08081A 100%)' }} />
        <div className="absolute inset-0 opacity-20" 
          style={{ background: 'radial-gradient(circle at 20% 50%, #FF6B35 0%, transparent 50%), radial-gradient(circle at 80% 80%, #FF3A8C 0%, transparent 50%)' }} />
        
        <div className="max-w-4xl mx-auto px-4 h-full flex flex-col justify-end pb-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center text-4xl font-bold shadow-2xl border-4 border-[#08081A]"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-2 right-2 p-2 rounded-xl bg-[#12122A] border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} />
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold">{user.full_name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" 
                  style={{ background: 'rgba(255,107,53,0.2)', color: '#FF6B35' }}>
                  {user.role}
                </span>
              </div>
              <p className="text-white/40 text-sm mt-1">{user.email}</p>
            </div>

            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Edit3 size={16} /> Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancel}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <X size={20} />
                </button>
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 text-white"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                  <Save size={16} /> Lưu thay đổi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2">
            <div className="rounded-3xl p-6 md:p-8 space-y-8" 
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.05)' }}>
              
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <User size={18} className="text-[#FF6B35]" /> Thông tin cá nhân
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/30">Họ và tên</label>
                    {isEditing ? (
                      <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                    ) : (
                      <p className="text-sm font-medium">{user.full_name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/30">Email</label>
                    <p className="text-sm font-medium opacity-60 flex items-center gap-2">
                      <Mail size={14} /> {user.email}
                    </p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/30">Số điện thoại</label>
                    {isEditing ? (
                      <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                        placeholder="Chưa cập nhật" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                    ) : (
                      <p className="text-sm font-medium">{user.phone || 'Chưa cập nhật'}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/30">Giới tính</label>
                    {isEditing ? (
                      <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value as UserGender})}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="male" className="bg-[#12122A]">Nam</option>
                        <option value="female" className="bg-[#12122A]">Nữ</option>
                        <option value="other" className="bg-[#12122A]">Khác</option>
                      </select>
                    ) : (
                      <p className="text-sm font-medium">
                        {user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
                      </p>
                    )}
                  </div>

                  {/* Birth Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/30">Ngày sinh</label>
                    {isEditing ? (
                      <input type="date" value={form.birth_date} onChange={e => setForm({...form, birth_date: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ ...inputStyle, colorScheme: 'dark' }} />
                    ) : (
                      <p className="text-sm font-medium">
                        {user.birth_date ? new Date(user.birth_date).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Stats */}
          <div className="space-y-6">
            <div className="rounded-3xl p-6" style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <ChevronRight size={16} className="text-[#FF6B35]" /> Thống kê của bạn
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5">
                  <span className="text-xs opacity-40">Sự kiện đã tham gia</span>
                  <span className="font-bold text-[#FF6B35]">12</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5">
                  <span className="text-xs opacity-40">Vé đã mua</span>
                  <span className="font-bold text-[#FF6B35]">24</span>
                </div>
              </div>
            </div>

            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-red-500/10 text-red-500 border border-red-500/20 transition-all hover:bg-red-500/20">
              <LogOut size={18} /> Đăng xuất tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
