import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Armchair, ArrowRight, BadgeDollarSign, CalendarDays, MapPin, ShieldCheck, Ticket, Timer, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { EventCard, FlashSaleTimer } from '../components/EventCard';
import { formatDateTime, formatPrice, getAutoEventStatus, getEventCity, isSaleOpen, requiresQueue } from '../data/mockData';
import { useClockTick } from '../hooks/useClockTick';

export default function HomePage() {
  const { events, getStats } = useApp();
  const { language, t } = usePreferences();
  const now = useClockTick();
  const openEvents = events.filter(event => getAutoEventStatus(event, getStats(event.id), now) === 'on_sale');
  const queueEvents = openEvents.filter(event => requiresQueue(event, getStats(event.id)));
  const availableSeats = openEvents.reduce((sum, event) => sum + getStats(event.id).available, 0);

  const heroEvents = openEvents.slice(0, 5);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    if (heroEvents.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => {
        if (prev === heroEvents.length - 1) {
          setTimeout(() => {
            setIsTransitioning(false);
            setCurrentHeroIndex(0);
          }, 700);
          return prev + 1;
        }
        return prev + 1;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [heroEvents.length]);

  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const activeDotIndex = currentHeroIndex === heroEvents.length ? 0 : currentHeroIndex;
  const renderEvents = heroEvents.length > 0 ? [...heroEvents, heroEvents[0]] : [];

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      {heroEvents.length > 0 && (
        <section className="relative overflow-hidden min-h-[520px]">
          <div 
            className={`flex w-full ${isTransitioning ? 'transition-transform duration-700 ease-in-out' : ''}`}
            style={{ transform: `translateX(-${currentHeroIndex * 100}%)` }}
          >
            {renderEvents.map((event, index) => {
              const stats = getStats(event.id);
              return (
                <div 
                  key={`${event.id}-${index}`} 
                  className="relative w-full shrink-0"
                >
                  <div className="absolute inset-0">
                    <img src={event.banner_url} alt={event.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(15,23,42,0.92), rgba(15,23,42,0.62), rgba(15,23,42,0.22))' }} />
                  </div>
                  <div className="relative mx-auto grid min-h-[520px] max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                    <div className="flex flex-col justify-center">
                      <div className="mb-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase" style={{ background: '#F97316', color: '#fff' }}>
                          <Timer size={13} /> {requiresQueue(event, stats) ? t('queueEnabled') : t('saleOpen')}
                        </span>
                      </div>

                      <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
                        {event.title}
                      </h1>
                      <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: 'rgba(255,255,255,0.72)' }}>
                        {event.description}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
                        <span className="inline-flex items-center gap-2"><CalendarDays size={16} style={{ color: '#FDBA74' }} /> {formatDateTime(event.event_time)}</span>
                        <span className="inline-flex items-center gap-2"><MapPin size={16} style={{ color: '#FDBA74' }} /> {event.location}</span>
                      </div>

                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link 
                          to={`/events/${event.id}`} 
                          className="inline-flex items-center gap-2 rounded-md px-5 py-3 font-bold text-white transition-transform hover:scale-105" 
                          style={{ background: '#F97316', boxShadow: '0 18px 42px rgba(249,115,22,0.32)' }}
                          tabIndex={index === currentHeroIndex ? 0 : -1}
                        >
                          {language === 'en' ? 'Book now' : 'Đặt vé'} <ArrowRight size={18} />
                        </Link>
                        <Link 
                          to="/events" 
                          className="rounded-md px-5 py-3 font-bold transition-colors hover:bg-white/10" 
                          style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}
                          tabIndex={index === currentHeroIndex ? 0 : -1}
                        >
                          {language === 'en' ? 'View events' : 'Xem sự kiện'}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-end lg:items-center">
                      <div className="tr-hero-seat-card w-full rounded-lg p-5" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.62)', backdropFilter: 'blur(16px)' }}>
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#64748B' }}>{getEventCity(event)}</p>
                            <h2 className="text-xl font-black">{language === 'en' ? 'Seat status' : 'Tình trạng ghế'}</h2>
                          </div>
                          <span className="rounded-md px-3 py-1.5 text-sm font-black" style={{ background: '#DCFCE7', color: '#166534' }}>
                            {stats.available} {t('available')}
                          </span>
                        </div>
                        <div className="tr-progress-track mb-4 h-3 overflow-hidden rounded-full" style={{ background: '#E2E8F0' }}>
                          <div className="h-full rounded-full" style={{ width: `${stats.occupancy_pct}%`, background: 'linear-gradient(90deg,#0EA5E9,#F97316)' }} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: language === 'en' ? 'Sold' : 'Đã bán', value: stats.sold.toLocaleString(), icon: Ticket },
                            { label: language === 'en' ? 'Held' : 'Đang giữ', value: stats.locked.toLocaleString(), icon: ShieldCheck },
                            { label: t('priceFrom'), value: formatPrice(stats.min_price), icon: BadgeDollarSign },
                          ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="tr-hero-seat-metric rounded-md p-3" style={{ background: '#F1F5F9' }}>
                              <Icon size={17} style={{ color: '#F97316' }} />
                              <div className="mt-2 text-lg font-black">{value}</div>
                              <div className="text-xs font-medium" style={{ color: '#64748B' }}>{label}</div>
                            </div>
                          ))}
                        </div>
                        {requiresQueue(event, stats) && (
                          <div className="mt-4 rounded-md p-3 text-sm font-bold" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                            {t('queue')} {language === 'en' ? 'open until' : 'mở đến'} <FlashSaleTimer endsAt={event.sale_end_time} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 z-20">
            {heroEvents.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsTransitioning(true);
                  setCurrentHeroIndex(idx);
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${idx === activeDotIndex ? 'w-8 bg-[#F97316]' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                aria-label={`${language === 'en' ? 'Go to slide' : 'Đến slide'} ${idx + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: t('events'), value: events.length.toLocaleString(), icon: CalendarDays, color: '#0EA5E9' },
            { label: t('saleOpen'), value: openEvents.length.toLocaleString(), icon: Ticket, color: '#F97316' },
            { label: language === 'en' ? 'Available seats' : 'Ghế còn trống', value: availableSeats.toLocaleString(), icon: Armchair, color: '#16A34A' },
            { label: t('queueEnabled'), value: queueEvents.length.toLocaleString(), icon: Users, color: '#7C3AED' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg p-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md" style={{ background: `${color}16`, color }}>
                <Icon size={19} />
              </div>
              <div className="text-2xl font-black">{value}</div>
              <div className="text-sm font-medium" style={{ color: '#64748B' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {queueEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">{language === 'en' ? 'Active queues' : 'Hàng chờ đang hoạt động'}</h2>
              <p className="text-sm" style={{ color: '#64748B' }}>{language === 'en' ? 'Events using queue before seat selection' : 'Các sự kiện đang áp dụng hàng chờ khi đặt vé'}</p>
            </div>
            <Link to="/events" className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold" style={{ background: '#0F172A', color: '#fff' }}>
              {t('all')} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {queueEvents.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">{language === 'en' ? 'Upcoming events' : 'Sự kiện sắp diễn ra'}</h2>
            <p className="text-sm" style={{ color: '#64748B' }}>{language === 'en' ? 'Choose an event and book while seats are available' : 'Chọn sự kiện phù hợp và đặt vé khi còn chỗ'}</p>
          </div>
          <span className="hidden rounded-md px-3 py-2 text-sm font-bold md:inline-flex" style={{ background: '#E0F2FE', color: '#075985' }}>
            {openEvents.filter(isSaleOpen).length} {language === 'en' ? 'on sale' : 'đang bán'}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 6).map(event => <EventCard key={event.id} event={event} />)}
        </div>
      </section>
    </main>
  );
}
