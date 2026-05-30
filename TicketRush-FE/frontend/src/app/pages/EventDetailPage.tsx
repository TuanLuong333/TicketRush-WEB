import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, BadgeDollarSign, CalendarDays, Clock, MapPin, ShieldCheck, Ticket, Timer, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { getEventStatusLabel } from '../data/types';
import { formatDateTime, formatPrice, getAutoEventStatus, getZoneColor, requiresQueue } from '../data/mockData';
import { FlashSaleTimer } from '../components/EventCard';
import { useClockTick } from '../hooks/useClockTick';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEvent, getZones, getStats, user, enterQueue, refreshSeatMap, getQueueLoad } = useApp();
  const { language, t } = usePreferences();
  const now = useClockTick();
  const event = getEvent(id ?? 0);

  useEffect(() => {
    if (event) void refreshSeatMap(event.id);
  }, [event, refreshSeatMap]);

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: '#F8FAFC', color: '#0F172A' }}>
        <div className="text-center">
          <h1 className="text-xl font-black">{language === 'en' ? 'Event not found' : 'Không tìm thấy sự kiện'}</h1>
          <Link to="/events" className="mt-4 inline-flex rounded-md px-4 py-2 text-sm font-bold" style={{ background: '#0F172A', color: '#fff' }}>
            {language === 'en' ? 'Back to list' : 'Về danh sách'}
          </Link>
        </div>
      </main>
    );
  }

  const zones = getZones(event.id);
  const stats = getStats(event.id);
  const status = getAutoEventStatus(event, stats, now);
  const queueEnabled = requiresQueue(event, stats, getQueueLoad(event.id));
  const saleOpen = status === 'on_sale';

  const handleBooking = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (queueEnabled) {
      await enterQueue(event.id);
      navigate(`/queue/${event.id}`);
      return;
    }
    navigate(`/events/${event.id}/seats`);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <section className="relative overflow-hidden">
        <img src={event.banner_url} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.45), rgba(15,23,42,0.96))' }} />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-24 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <ArrowLeft size={16} /> {language === 'en' ? 'Back' : 'Quay lại'}
          </button>

          <div className="max-w-4xl pb-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-md px-3 py-1.5 text-xs font-black uppercase" style={{ background: saleOpen ? '#16A34A' : '#64748B', color: '#fff' }}>
                {getEventStatusLabel(status, language)}
              </span>
              {queueEnabled && (
                <span className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-black uppercase" style={{ background: '#F97316', color: '#fff' }}>
                  <Timer size={13} /> {t('queue')}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">{event.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {event.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
              <span className="inline-flex items-center gap-2"><CalendarDays size={16} style={{ color: '#FDBA74' }} /> {formatDateTime(event.event_time)}</span>
              <span className="inline-flex items-center gap-2"><MapPin size={16} style={{ color: '#FDBA74' }} /> {event.location}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-7">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: language === 'en' ? 'Total seats' : 'Tổng ghế', value: stats.total_capacity.toLocaleString(), icon: Users, color: '#0EA5E9' },
                { label: language === 'en' ? 'Available seats' : 'Ghế trống', value: stats.available.toLocaleString(), icon: Ticket, color: '#16A34A' },
                { label: language === 'en' ? 'Held seats' : 'Đang giữ', value: stats.locked.toLocaleString(), icon: ShieldCheck, color: '#F97316' },
                { label: language === 'en' ? 'Sold ratio' : 'Tỷ lệ đã bán', value: `${stats.occupancy_pct}%`, icon: BadgeDollarSign, color: '#7C3AED' },
              ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-lg p-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                <Icon size={20} style={{ color }} />
                <div className="mt-3 text-2xl font-black">{value}</div>
                <div className="text-sm font-medium" style={{ color: '#64748B' }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">{language === 'en' ? 'Seat zones and prices' : 'Khu ghế và giá bán'}</h2>
                <p className="text-sm" style={{ color: '#64748B' }}>{language === 'en' ? 'Each zone has its own price and capacity' : 'Mỗi khu có mức giá và số lượng ghế riêng'}</p>
              </div>
              <span className="rounded-md px-3 py-1.5 text-sm font-bold" style={{ background: '#F1F5F9', color: '#475569' }}>
                {zones.length} {language === 'en' ? 'zones' : 'khu'}
              </span>
            </div>
            <div className="space-y-3">
              {zones.map(zone => {
                const color = zone.color || getZoneColor(zone.id);
                const seatCount = zone.total_capacity;
                return (
                  <div key={zone.id} className="flex items-center justify-between gap-4 rounded-lg p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 rounded-sm" style={{ background: color }} />
                      <div>
                        <div className="font-black">{zone.name}</div>
                        <div className="text-sm" style={{ color: '#64748B' }}>{seatCount} {language === 'en' ? 'seats in this zone' : 'ghế trong khu này'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black" style={{ color }}>{formatPrice(zone.price)}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>/ {language === 'en' ? 'seat' : 'ghế'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside>
          <div className="sticky top-24 rounded-lg p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 22px 60px rgba(15,23,42,0.08)' }}>
            <p className="text-sm font-semibold" style={{ color: '#64748B' }}>{language === 'en' ? 'Ticket price from' : 'Giá vé từ'}</p>
            <div className="mt-1 text-3xl font-black" style={{ color: '#F97316' }}>{formatPrice(stats.min_price)}</div>

            <div className="my-5">
              <div className="mb-2 flex justify-between text-sm">
                <span style={{ color: '#64748B' }}>{language === 'en' ? 'Sold ratio' : 'Tỷ lệ bán'}</span>
                <span className="font-bold">{stats.occupancy_pct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full" style={{ background: '#E2E8F0' }}>
                <div className="h-full rounded-full" style={{ width: `${stats.occupancy_pct}%`, background: 'linear-gradient(90deg,#0EA5E9,#F97316)' }} />
              </div>
            </div>

            {queueEnabled && (
              <div className="mb-4 rounded-md p-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#C2410C' }}>
                <div className="mb-1 flex items-center gap-2 text-sm font-black"><Clock size={15} /> {language === 'en' ? 'Queue is enabled' : 'Hàng chờ đang bật'}</div>
                <div className="font-mono text-sm"><FlashSaleTimer endsAt={event.sale_end_time} /></div>
              </div>
            )}

            <button
              onClick={handleBooking}
              disabled={!saleOpen}
              className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-black text-white transition-transform enabled:hover:scale-105"
              style={{
                background: saleOpen ? '#F97316' : '#CBD5E1',
                cursor: saleOpen ? 'pointer' : 'not-allowed',
              }}
            >
              {queueEnabled ? (language === 'en' ? 'Join queue' : 'Vào hàng chờ') : (language === 'en' ? 'Select seats' : 'Chọn ghế')} <ArrowRight size={18} />
            </button>
            <p className="mt-3 text-center text-xs" style={{ color: '#64748B' }}>
              {language === 'en' ? 'Sale' : 'Mở bán'}: {formatDateTime(event.sale_start_time)} - {formatDateTime(event.sale_end_time)}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
