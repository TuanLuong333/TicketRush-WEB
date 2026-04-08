import { useParams, useNavigate } from 'react-router';
import { Calendar, MapPin, Music, ChevronRight, Users, Zap, Clock, ArrowLeft } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatDate, formatPrice } from '../data/mockData';
import { PRICE_TIER_CONFIG } from '../data/types';
import { FlashSaleTimer } from '../components/EventCard';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEvent, enterQueue, user } = useApp();

  const event = getEvent(id ?? '');

  if (!event) {
    return (
      <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}
        className="flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Không tìm thấy sự kiện</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,107,53,0.2)', color: '#FF6B35' }}>
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const occupancy = Math.round((event.sold_seats / event.total_seats) * 100);
  const minPrice = Math.min(...event.sections.map(s => s.price));

  const handleBooking = () => {
    if (!user) { navigate('/login'); return; }
    if (event.has_queue) {
      enterQueue(event.id);
      navigate(`/queue/${event.id}`);
    } else {
      navigate(`/events/${event.id}/seats`);
    }
  };

  const startTime = new Date(event.date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const endTime   = new Date(event.date_end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Banner */}
      <div className="relative" style={{ height: 400 }}>
        <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(8,8,26,0.3) 0%, rgba(8,8,26,0.95) 100%)'
        }} />
        <button onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ArrowLeft size={15} /> Quay lại
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event title */}
            <div className="mb-6">
              {event.has_queue && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)', color: '#fff' }}>
                  <Zap size={11} /> FLASH SALE •
                  {event.flash_sale_ends && <FlashSaleTimer endsAt={event.flash_sale_ends} />}
                </div>
              )}
              <div className="text-sm font-semibold mb-1" style={{ color: '#FF6B35' }}>{event.artist}</div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.1 }}>
                {event.title}
              </h1>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Calendar, label: 'Ngày & Giờ', value: `${formatDate(event.date_start)} • ${startTime} – ${endTime}` },
                { icon: MapPin,   label: 'Địa điểm',   value: event.venue },
                { icon: Users,    label: 'Thành phố',  value: event.city },
                { icon: Music,    label: 'Thể loại',   value: event.genres.join(' • ') },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,107,53,0.15)' }}>
                    <Icon size={16} style={{ color: '#FF6B35' }} />
                  </div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</div>
                    <div className="text-sm" style={{ color: '#fff' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="p-5 rounded-xl mb-8"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-3" style={{ color: '#fff', fontWeight: 600 }}>Giới thiệu sự kiện</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: '0.95rem' }}>
                {event.description}
              </p>
            </div>

            {/* Venue Sections / Price Table */}
            <div className="p-5 rounded-xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4" style={{ color: '#fff', fontWeight: 600 }}>Bảng giá vé</h3>
              <div className="space-y-3">
                {event.sections.map(section => {
                  const tierConfig = PRICE_TIER_CONFIG[section.price_tier];
                  const available = section.total_seats - section.sold_seats;
                  return (
                    <div key={section.section_name} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ background: section.color }} />
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#fff' }}>
                            {section.section_name}
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                              style={{ background: section.color + '20', color: section.color }}>
                              {tierConfig.label}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {section.total_seats} ghế •{' '}
                            <span style={{ color: available > 10 ? '#10B981' : '#FF6B6B' }}>
                              {available} còn trống
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold" style={{ color: section.color }}>{formatPrice(section.price)}</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>/ghế</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-2xl"
              style={{ background: '#12122A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="mb-4">
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Giá vé từ</p>
                <p className="font-bold" style={{ color: '#FF6B35', fontSize: '1.8rem' }}>
                  {formatPrice(minPrice)}
                </p>
              </div>

              {/* Occupancy */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Tình trạng vé</span>
                  <span className="text-xs font-semibold" style={{ color: occupancy >= 80 ? '#FF6B6B' : '#10B981' }}>
                    {100 - occupancy}% còn trống
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${occupancy}%`,
                      background: occupancy >= 80 ? 'linear-gradient(90deg, #FF6B35, #EF4444)' : '#10B981',
                    }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {event.sold_seats.toLocaleString()} đã bán
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {event.total_seats.toLocaleString()} tổng
                  </span>
                </div>
              </div>

              {/* Flash sale warning */}
              {event.has_queue && (
                <div className="p-3 rounded-xl mb-4 flex items-start gap-2"
                  style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)' }}>
                  <Clock size={14} style={{ color: '#FF6B35', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#FF6B35' }}>Lưu ý Flash Sale</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Do lưu lượng cao, bạn có thể vào hàng chờ ảo trước khi chọn ghế.
                    </p>
                  </div>
                </div>
              )}

              <button onClick={handleBooking}
                className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)',
                  boxShadow: '0 8px 24px rgba(255,107,53,0.35)',
                }}>
                Chọn ghế ngay <ChevronRight size={16} />
              </button>

              <div className="mt-4 space-y-2">
                {[
                  '✓ Vé điện tử QR Code',
                  '✓ Giữ ghế 10 phút',
                  '✓ Hỗ trợ 24/7',
                ].map(item => (
                  <div key={item} className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
