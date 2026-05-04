import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, Zap } from 'lucide-react';
import type { Event } from '../data/types';
import { formatDate, formatPrice } from '../data/mockData';

interface EventCardProps {
  event: Event;
  featured?: boolean;
}

export function EventCard({ event, featured }: EventCardProps) {
  const occupancy = Math.round((event.sold_seats / event.total_seats) * 100);
  const minPrice = Math.min(...event.sections.map(s => s.price));

  return (
    <Link to={`/events/${event.id}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: '#12122A',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: featured ? 240 : 180 }}>
        <img src={event.banner_url} alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,8,26,0.9) 0%, transparent 60%)' }} />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {event.has_queue && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)', color: '#fff' }}>
              <Zap size={10} /> FLASH SALE
            </span>
          )}
          {event.status === 'sold_out' && (
            <span className="px-2 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
              HẾT VÉ
            </span>
          )}
          {occupancy >= 90 && event.status !== 'sold_out' && (
            <span className="px-2 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}>
              SẮP HẾT VÉ
            </span>
          )}
        </div>

        {/* Genres */}
        <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
          {event.genres.slice(0, 2).map(g => (
            <span key={g} className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs mb-1" style={{ color: '#FF6B35', fontWeight: 600 }}>{event.artist}</p>
        <h3 className="mb-2 truncate" style={{ color: '#fff', fontWeight: 700, fontSize: featured ? '1.1rem' : '1rem' }}>
          {event.title}
        </h3>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Calendar size={12} style={{ color: '#FF6B35' }} />
            <span>{formatDate(event.date_start)} • {new Date(event.date_start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <MapPin size={12} style={{ color: '#FF6B35' }} />
            <span className="truncate">{event.venue}, {event.city}</span>
          </div>
        </div>

        {/* Occupancy bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Đã bán</span>
            <span className="text-xs font-medium" style={{ color: occupancy >= 80 ? '#FF6B6B' : '#10B981' }}>
              {occupancy}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${occupancy}%`,
                background: occupancy >= 80 ? 'linear-gradient(90deg, #FF6B35, #FF3A8C)' : '#10B981',
              }} />
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Từ</p>
            <p className="font-bold" style={{ color: '#FF6B35', fontSize: '1rem' }}>{formatPrice(minPrice)}</p>
          </div>
          <span className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
            Đặt vé
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FlashSaleTimer({ endsAt }: { endsAt: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = new Date(endsAt).getTime() - Date.now();
  const h = Math.max(0, Math.floor(diff / 3600000));
  const m = Math.max(0, Math.floor((diff % 3600000) / 60000));
  const s = Math.max(0, Math.floor((diff % 60000) / 1000));

  return (
    <div className="flex items-center gap-1">
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span style={{ color: 'rgba(255,255,255,0.72)', margin: '0 2px' }}>:</span>}
          <span className="inline-block px-2 py-1 rounded-md font-mono font-bold text-sm"
            style={{
              background: 'rgba(8,8,26,0.28)',
              color: '#fff',
              minWidth: 32,
              textAlign: 'center',
              textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }}>
            {String(v).padStart(2, '0')}
          </span>
        </span>
      ))}
    </div>
  );
}
