import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, Timer, Users } from 'lucide-react';
import type { Event } from '../data/types';
import { getEventStatusLabel } from '../data/types';
import { formatDateTime, formatPrice, getAutoEventStatus, getEventCity, requiresQueue } from '../data/mockData';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { useClockTick } from '../hooks/useClockTick';

interface EventCardProps {
  event: Event;
  featured?: boolean;
}

export function EventCard({ event, featured = false }: EventCardProps) {
  const { getStats } = useApp();
  const { language, t } = usePreferences();
  const now = useClockTick();
  const stats = getStats(event.id);
  const status = getAutoEventStatus(event, stats, now);
  const queueEnabled = requiresQueue(event, stats);

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block overflow-hidden rounded-lg transition-all duration-300 hover:-translate-y-1"
      style={{
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
      }}
    >
      <div className="relative" style={{ height: featured ? 248 : 184 }}>
        <img src={event.banner_url} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,7,18,0.94), rgba(3,7,18,0.18) 62%)' }} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className="rounded-md px-2 py-1 text-[11px] font-bold uppercase"
            style={{
              background: status === 'on_sale' ? 'rgba(16,185,129,0.9)' : 'rgba(148,163,184,0.9)',
              color: '#fff',
            }}
          >
            {getEventStatusLabel(status, language)}
          </span>
          {queueEnabled && (
            <span className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold uppercase" style={{ background: '#F97316', color: '#fff' }}>
              <Timer size={11} /> {t('queue')}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="line-clamp-2 text-lg font-extrabold" style={{ color: '#fff' }}>{event.title}</h3>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <Calendar size={14} style={{ color: '#F97316' }} />
            <span>{formatDateTime(event.event_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <MapPin size={14} style={{ color: '#F97316' }} />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.46)' }}>
            <span>{getEventCity(event)}</span>
            <span>{stats.sold}/{stats.total_capacity} {t('seats')}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${stats.occupancy_pct}%`,
                background: stats.occupancy_pct >= 80 ? 'linear-gradient(90deg,#F97316,#EF4444)' : 'linear-gradient(90deg,#38BDF8,#22C55E)',
              }}
            />
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>{t('priceFrom')}</p>
            <p className="text-lg font-extrabold" style={{ color: '#F97316' }}>{formatPrice(stats.min_price)}</p>
          </div>
          <span className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold" style={{ background: 'rgba(249,115,22,0.16)', color: '#FDBA74', border: '1px solid rgba(249,115,22,0.28)' }}>
            <Users size={14} />
            {stats.available} {t('available')}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FlashSaleTimer({ endsAt }: { endsAt: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <span className="font-mono">
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
