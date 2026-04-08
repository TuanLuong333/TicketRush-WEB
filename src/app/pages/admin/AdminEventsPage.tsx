import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Edit2, Eye, Calendar, Ticket } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { formatDate, formatPrice } from '../../data/mockData';
import { REVENUE_SUMMARY } from '../../data/mockData';

export default function AdminEventsPage() {
  const { events } = useApp();
  const [search, setSearch] = useState('');

  const filtered = events.filter(e =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.artist.toLowerCase().includes(search.toLowerCase())
  );

  // Total revenue per event — approximated from REVENUE_SUMMARY
  const totalRevenue = REVENUE_SUMMARY.reduce((s, d) => s + d.total_revenue, 0);
  const revenuePerSeat = totalRevenue / Math.max(1, REVENUE_SUMMARY.reduce((s, d) => s + d.total_tickets, 0));

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem' }}>Quản lý sự kiện</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{events.length} sự kiện</p>
          </div>
          <Link to="/admin/events/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
            <Plus size={16} /> Tạo sự kiện mới
          </Link>
        </div>
      </div>

      <div className="p-6">
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm sự kiện..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: '#12122A',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          />
        </div>

        {/* Events Table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Sự kiện', 'Ngày bắt đầu', 'Địa điểm', 'Vé bán/Tổng', 'D.thu ước tính', 'Trạng thái', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(event => {
                  const occupancy = Math.round((event.sold_seats / event.total_seats) * 100);
                  const revenue = Math.round(event.sold_seats * revenuePerSeat);

                  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                    on_sale:  { label: 'Đang bán',   color: '#60A5FA', bg: 'rgba(59,130,246,0.15)' },
                    sold_out: { label: 'Hết vé',     color: '#FF6B6B', bg: 'rgba(239,68,68,0.15)' },
                    draft:    { label: 'Bản nháp',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)' },
                    ended:    { label: 'Đã kết thúc', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
                    cancelled:{ label: 'Đã hủy',     color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
                  };
                  const s = statusConfig[event.status] ?? statusConfig.draft;

                  return (
                    <tr key={event.id} className="group hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {/* Event */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={event.banner_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          <div>
                            <div className="text-xs font-semibold" style={{ color: '#fff' }}>{event.title}</div>
                            <div className="text-xs" style={{ color: '#FF6B35' }}>{event.artist}</div>
                          </div>
                        </div>
                      </td>
                      {/* Date Start */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <Calendar size={11} />
                          {formatDate(event.date_start)}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(event.date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          {' – '}
                          {new Date(event.date_end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      {/* Venue + City */}
                      <td className="px-4 py-3">
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.venue}
                        </div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{event.city}</div>
                      </td>
                      {/* Tickets sold_seats / total_seats */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#fff' }}>
                          <Ticket size={11} style={{ color: '#FF6B35' }} />
                          {event.sold_seats}/{event.total_seats}
                        </div>
                        <div className="h-1.5 w-20 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full"
                            style={{
                              width: `${occupancy}%`,
                              background: occupancy >= 80 ? 'linear-gradient(90deg,#FF6B35,#EF4444)' : '#10B981',
                            }} />
                        </div>
                      </td>
                      {/* Revenue */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold" style={{ color: '#10B981' }}>
                          {formatPrice(revenue)}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                        {event.has_queue && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs"
                            style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35' }}>
                            Queue
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/events/${event.id}`}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            style={{ color: 'rgba(255,255,255,0.5)' }}>
                            <Eye size={13} />
                          </Link>
                          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            style={{ color: 'rgba(255,255,255,0.5)' }}>
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
