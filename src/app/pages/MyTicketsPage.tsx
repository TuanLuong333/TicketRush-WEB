import { useState } from 'react';
import { useNavigate } from 'react-router';
import QRCode from 'react-qr-code';
import { Ticket, Calendar, MapPin, Download, X, ChevronRight, Search } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatDate, formatPrice } from '../data/mockData';
import type { Order } from '../data/types';

export default function MyTicketsPage() {
  const { orders, user } = useApp();
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');

  if (!user) {
    return (
      <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
        className="flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Ticket size={56} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <h2 className="mb-2" style={{ color: '#fff' }}>Vui lòng đăng nhập</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Đăng nhập để xem vé điện tử của bạn
          </p>
          <button onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  const filtered = orders.filter(o =>
    !search ||
    o.event_title.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.8rem' }}>Vé của tôi</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {orders.length} đơn đặt vé
            </p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm vé..."
              className="pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Ticket size={56} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chưa có vé nào</p>
            <button onClick={() => navigate('/')}
              className="mt-4 px-5 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,107,53,0.2)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.3)' }}>
              Khám phá sự kiện
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => (
              <div key={order.id}
                className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 cursor-pointer"
                style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={() => setSelectedOrder(order)}>
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="sm:w-32 h-32 sm:h-auto flex-shrink-0">
                    <img src={order.event_banner_url} alt={order.event_title}
                      className="w-full h-full object-cover" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-xs mb-0.5" style={{ color: '#FF6B35' }}>{order.event_artist}</div>
                        <h3 className="font-bold text-base" style={{ color: '#fff' }}>{order.event_title}</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                        style={{
                          background: order.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: order.status === 'confirmed' ? '#10B981' : '#F59E0B',
                          border: `1px solid ${order.status === 'confirmed' ? '#10B98130' : '#F59E0B30'}`,
                        }}>
                        {order.status === 'confirmed' ? '✓ Đã xác nhận' : 'Đang chờ'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <Calendar size={11} style={{ color: '#FF6B35' }} />
                        {formatDate(order.event_date_start)} • {new Date(order.event_date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <MapPin size={11} style={{ color: '#FF6B35' }} />
                        {order.event_venue}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                          {order.items.length} vé
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Mã: {order.id}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          • {order.payment_method}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: '#FF6B35' }}>
                          {formatPrice(order.total_amount)}
                        </span>
                        <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedOrder(null)}>
          <div className="max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.12)' }}>
              {/* Header */}
              <div className="relative">
                <img src={selectedOrder.event_banner_url} alt="" className="w-full h-36 object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(18,18,42,1))' }} />
                <button onClick={() => setSelectedOrder(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                  <X size={14} />
                </button>
                <div className="absolute bottom-3 left-4">
                  <div className="text-xs" style={{ color: '#FF6B35' }}>{selectedOrder.event_artist}</div>
                  <div className="font-bold text-sm" style={{ color: '#fff' }}>{selectedOrder.event_title}</div>
                </div>
              </div>

              <div className="p-5">
                {/* Divider with holes */}
                <div className="relative flex items-center mb-5"
                  style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: 16 }}>
                  <div className="absolute -top-3 -left-5 w-6 h-6 rounded-full" style={{ background: '#08081A' }} />
                  <div className="absolute -top-3 -right-5 w-6 h-6 rounded-full" style={{ background: '#08081A' }} />
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: 'Ngày',       value: formatDate(selectedOrder.event_date_start) },
                    { label: 'Giờ',        value: new Date(selectedOrder.event_date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) },
                    { label: 'Địa điểm',   value: selectedOrder.event_venue },
                    { label: 'Mã đơn',     value: selectedOrder.id },
                    { label: 'Thanh toán', value: selectedOrder.payment_method },
                    { label: 'Tổng tiền',  value: formatPrice(selectedOrder.total_amount) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                      <div className="text-xs font-semibold" style={{ color: '#fff' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Order Items (seats) */}
                <div className="mb-5">
                  <div className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Ghế ({selectedOrder.items.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOrder.items.map(item => (
                      <span key={item.id} className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.2)' }}>
                        {item.section_name} {item.row_label}{item.seat_number}
                      </span>
                    ))}
                  </div>
                </div>

                {/* QR Code — uses ticket qr_code from first ticket */}
                <div className="flex justify-center p-4 rounded-xl mb-4"
                  style={{ background: '#fff' }}>
                  <QRCode
                    value={selectedOrder.tickets[0]?.qr_code ?? `TR:${selectedOrder.id}`}
                    size={160}
                    style={{ height: 160, width: 160 }}
                  />
                </div>

                <div className="text-center text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Xuất trình QR Code này tại cổng vào
                </div>
                <div className="text-center text-xs mb-4 font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {selectedOrder.tickets[0]?.qr_code}
                </div>

                <div className="flex gap-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.2)' }}>
                    <Download size={14} /> Tải vé
                  </button>
                  <button onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
