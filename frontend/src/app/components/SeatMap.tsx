import { useState } from 'react';
import type { Seat, SeatZone } from '../data/types';
import { getSeatStatusLabel } from '../data/types';
import { formatPrice, getZoneColor } from '../data/mockData';
import { usePreferences } from '../store/PreferencesContext';

interface SeatMapProps {
  zones: SeatZone[];
  seats: Seat[];
  onSeatClick: (seat: Seat) => void;
  maxSelect?: number;
}

interface TooltipState {
  seat: Seat;
  zone: SeatZone;
  x: number;
  y: number;
}

function seatStyle(seat: Seat, zoneColor: string) {
  if (seat.status === 'selected') {
    return { background: '#F97316', border: '#FDBA74', color: '#fff', shadow: '0 0 0 2px rgba(249,115,22,0.28)' };
  }
  if (seat.status === 'available') {
    return { background: `${zoneColor}30`, border: zoneColor, color: '#fff', shadow: 'none' };
  }
  if (seat.status === 'locked') {
    return { background: '#334155', border: '#64748B', color: '#CBD5E1', shadow: 'none' };
  }
  return { background: '#0F172A', border: '#1E293B', color: '#475569', shadow: 'none' };
}

export function SeatMap({ zones, seats, onSeatClick, maxSelect = 8 }: SeatMapProps) {
  const { language } = usePreferences();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const selectedCount = seats.filter(seat => seat.status === 'selected').length;

  return (
    <div className="relative select-none">
      <div className="mb-7 flex justify-center">
        <div className="relative">
          <div
            className="rounded-md px-20 py-3 text-center text-xs font-extrabold uppercase tracking-[0.32em]"
            style={{
              background: 'linear-gradient(90deg, rgba(14,165,233,0.28), rgba(249,115,22,0.28))',
              border: '1px solid rgba(255,255,255,0.16)',
              color: 'rgba(255,255,255,0.78)',
            }}
          >
            {language === 'en' ? 'Stage' : 'Sân khấu'}
          </div>
          <div className="absolute -bottom-4 left-1/2 h-5 w-3/4 -translate-x-1/2 rounded-full" style={{ background: 'rgba(249,115,22,0.24)', filter: 'blur(12px)' }} />
        </div>
      </div>

      <div className="space-y-5">
        {zones.map(zone => {
          const zoneColor = zone.color || getZoneColor(zone.id);
          const zoneSeats = seats.filter(seat => seat.zone_id === zone.id);
          const rowLabels = Array.from(new Set(zoneSeats.map(seat => seat.row_label))).sort();
          const available = zoneSeats.filter(seat => seat.status === 'available').length;

          return (
            <section
              key={zone.id}
              className="overflow-hidden rounded-lg"
              onMouseEnter={() => setActiveZone(zone.id)}
              onMouseLeave={() => setActiveZone(null)}
              style={{
                background: activeZone === zone.id ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${activeZone === zone.id ? `${zoneColor}66` : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm" style={{ background: zoneColor }} />
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: '#fff' }}>{zone.name}</h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>{language === 'en' ? 'Zone' : 'Khu'} {zone.name} • {zone.total_capacity} {language === 'en' ? 'seats' : 'ghế'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: `${zoneColor}22`, color: zoneColor }}>
                    {formatPrice(zone.price)}
                  </span>
                  <span className="rounded-md px-2 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.62)' }}>
                    {available}/{zone.total_capacity} {language === 'en' ? 'available' : 'trống'}
                  </span>
                </div>
              </header>

              <div className="overflow-x-auto p-4">
                <div className="mx-auto min-w-max">
                  {rowLabels.map(rowLabel => {
                    const rowSeats = zoneSeats
                      .filter(seat => seat.row_label === rowLabel)
                      .sort((a, b) => a.seat_number - b.seat_number);

                    return (
                      <div key={rowLabel} className="mb-1 flex items-center gap-1">
                        <span className="mr-1 w-5 text-center font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{rowLabel}</span>
                        {rowSeats.map(seat => {
                          const style = seatStyle(seat, zoneColor);
                          const canClick = seat.status === 'available' || seat.status === 'selected';
                          const maxReached = seat.status === 'available' && selectedCount >= maxSelect;

                          return (
                            <button
                              key={seat.id}
                              type="button"
                              aria-label={`${zone.name} ${seat.row_label}${seat.seat_number} ${getSeatStatusLabel(seat.status, language)}`}
                              className="flex shrink-0 items-center justify-center rounded-[3px] text-[9px] transition-transform hover:scale-110"
                              style={{
                                width: 24,
                                height: 24,
                                background: style.background,
                                border: `1px solid ${style.border}`,
                                color: style.color,
                                boxShadow: style.shadow,
                                cursor: canClick && !maxReached ? 'pointer' : maxReached ? 'not-allowed' : 'default',
                                opacity: maxReached ? 0.38 : 1,
                              }}
                              onClick={() => {
                                if (canClick && !maxReached) onSeatClick(seat);
                              }}
                              onMouseEnter={event => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                setTooltip({ seat, zone, x: rect.left + rect.width / 2, y: rect.top });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              {seat.seat_number}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {tooltip && (
        <div
          className="fixed z-50 rounded-lg px-3 py-2 text-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y - 84,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            background: '#020617',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.36)',
            color: '#fff',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-bold">{tooltip.zone.name} - {language === 'en' ? 'Row' : 'Hàng'} {tooltip.seat.row_label}, {language === 'en' ? 'Seat' : 'Ghế'} {tooltip.seat.seat_number}</div>
          <div style={{ color: '#F97316' }}>{formatPrice(tooltip.zone.price)}</div>
          <div style={{ color: tooltip.seat.status === 'available' ? '#22C55E' : tooltip.seat.status === 'selected' ? '#F97316' : tooltip.seat.status === 'locked' ? '#FACC15' : '#64748B' }}>
            {getSeatStatusLabel(tooltip.seat.status, language)}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {[
          { label: getSeatStatusLabel('available', language), color: '#38BDF8', background: 'rgba(56,189,248,0.18)' },
          { label: getSeatStatusLabel('selected', language), color: '#F97316', background: '#F97316' },
          { label: getSeatStatusLabel('locked', language), color: '#94A3B8', background: '#334155' },
          { label: getSeatStatusLabel('sold', language), color: '#475569', background: '#0F172A' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.56)' }}>
            <span className="h-3.5 w-3.5 rounded-[3px]" style={{ background: item.background, border: `1px solid ${item.color}` }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
