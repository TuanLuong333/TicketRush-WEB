import { Link } from 'react-router';
import { Zap, TrendingUp, Calendar, ChevronRight, Music, MapPin, Flame } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { EventCard, FlashSaleTimer } from '../components/EventCard';
import { formatDate } from '../data/mockData';

export default function HomePage() {
  const { events } = useApp();
  const featured = events.filter(e => e.featured);
  const flashSale = events.filter(e => e.has_queue);

  const heroEvent = featured[0];

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Hero Section */}
      {heroEvent && (
        <div className="relative overflow-hidden" style={{ height: '70vh', minHeight: 480 }}>
          <img src={heroEvent.banner_url} alt={heroEvent.title}
            className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(8,8,26,0.92) 0%, rgba(8,8,26,0.6) 50%, rgba(8,8,26,0.8) 100%)'
          }} />
          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute rounded-full animate-pulse"
                style={{
                  width: Math.random() * 4 + 2,
                  height: Math.random() * 4 + 2,
                  left: `${10 + i * 15}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  background: '#FF6B35',
                  animationDelay: `${i * 0.5}s`,
                  opacity: 0.6,
                }} />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-2xl">
                {heroEvent.has_queue && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)', color: '#fff' }}>
                    <Zap size={12} /> FLASH SALE ĐANG DIỄN RA
                    {heroEvent.flash_sale_ends && <FlashSaleTimer endsAt={heroEvent.flash_sale_ends} />}
                  </div>
                )}
                <div className="text-sm font-semibold mb-2" style={{ color: '#FF6B35' }}>
                  {heroEvent.artist}
                </div>
                <h1 className="mb-3" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, color: '#fff' }}>
                  {heroEvent.title}
                </h1>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Calendar size={14} style={{ color: '#FF6B35' }} />
                    {formatDate(heroEvent.date_start)} • {new Date(heroEvent.date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <MapPin size={14} style={{ color: '#FF6B35' }} />
                    {heroEvent.venue}, {heroEvent.city}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {heroEvent.genres.map(g => (
                    <span key={g} className="px-3 py-1 rounded-full text-xs"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}>
                      {g}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Link to={`/events/${heroEvent.id}`}
                    className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)', boxShadow: '0 8px 24px rgba(255,107,53,0.4)' }}>
                    Đặt vé ngay
                  </Link>
                  <Link to="/events"
                    className="px-6 py-3 rounded-xl font-semibold transition-all hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                    Xem tất cả
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
            <div className="w-0.5 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Music,     label: 'Sự kiện',   value: '50+' },
              { icon: Flame,     label: 'Vé đã bán', value: '12,400+' },
              { icon: MapPin,    label: 'Thành phố', value: '10+' },
              { icon: TrendingUp, label: 'Khán giả',  value: '50,000+' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,107,53,0.15)' }}>
                  <Icon size={18} style={{ color: '#FF6B35' }} />
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ color: '#fff', lineHeight: 1.2 }}>{value}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Flash Sale Section */}
        {flashSale.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.3rem' }}>Flash Sale Hôm Nay</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Ưu đãi có giới hạn - Mua ngay kẻo hết!</p>
                </div>
              </div>
              <Link to="/events" className="flex items-center gap-1 text-sm hover:text-white transition-colors"
                style={{ color: '#FF6B35' }}>
                Xem thêm <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {flashSale.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#fff' }}>Sự Kiện Sắp Diễn Ra</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Những trải nghiệm âm nhạc tuyệt vời nhất đang chờ đón bạn.</p>
            </div>
            <Link to="/events" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,107,53,0.3)', color: '#FF6B35' }}>
              Khám phá tất cả <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.slice(0, 3).map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
