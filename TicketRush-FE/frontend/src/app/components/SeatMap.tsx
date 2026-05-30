import { useState } from 'react';
import type { Seat, SeatZone, ZoneLayout } from '../data/types';
import { getSeatStatusLabel } from '../data/types';
import { formatPrice, getZoneColor } from '../data/mockData';
import { usePreferences } from '../store/PreferencesContext';

interface SeatMapProps {
  zones: SeatZone[];
  seats: Seat[];
  layouts?: Array<ZoneLayout | undefined>;
  seatMapImageUrl?: string;
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
    return { background: `${zoneColor}1F`, border: zoneColor, color: '#0F172A', shadow: 'none' };
  }
  if (seat.status === 'locked') {
    return { background: '#FEF3C7', border: '#F59E0B', color: '#92400E', shadow: 'none' };
  }
  return { background: '#1E293B', border: '#64748B', color: '#CBD5E1', shadow: 'none' };
}

function sortedRowLabels(seats: Seat[]) {
  return Array.from(new Set(seats.map(seat => seat.row_label))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function SeatMap({ zones, seats, layouts = [], seatMapImageUrl, onSeatClick, maxSelect = 8 }: SeatMapProps) {
  const { language } = usePreferences();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const selectedCount = seats.filter(seat => seat.status === 'selected').length;
  const layoutByZone = new Map(
    layouts
      .filter((layout): layout is ZoneLayout => Boolean(layout))
      .map(layout => [layout.zone_id, layout]),
  );

  return (
    <div className="relative select-none">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {zones.map(zone => {
            const layout = layoutByZone.get(zone.id);
            const zoneColor = zone.color || layout?.color || getZoneColor(zone.id);
            const zoneSeats = seats.filter(seat => seat.zone_id === zone.id);
            const rowLabels = sortedRowLabels(zoneSeats);
            const available = zoneSeats.filter(seat => seat.status === 'available').length;
            const cols = layout?.cols || Math.max(1, ...zoneSeats.map(seat => seat.seat_number));
            const rows = layout?.rows || rowLabels.length;

            return (
              <section
                key={zone.id}
                className="overflow-hidden rounded-lg"
                onMouseEnter={() => setActiveZone(zone.id)}
                onMouseLeave={() => setActiveZone(null)}
                style={{
                  background: '#fff',
                  border: `1px solid ${activeZone === zone.id ? `${zoneColor}80` : '#E2E8F0'}`,
                  boxShadow: activeZone === zone.id ? `0 18px 36px ${zoneColor}18` : 'none',
                }}
              >
                <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <div className="flex items-center gap-3">
                    <span className="h-3.5 w-3.5 rounded-sm" style={{ background: zoneColor }} />
                    <div>
                      <h3 className="text-sm font-black" style={{ color: '#0F172A' }}>{zone.name}</h3>
                      <p className="text-xs" style={{ color: '#64748B' }}>{rows} {language === 'en' ? 'rows' : 'hàng'} x {cols} {language === 'en' ? 'columns' : 'cột'} • {zone.total_capacity} {language === 'en' ? 'seats' : 'ghế'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: `${zoneColor}1F`, color: zoneColor }}>
                      {formatPrice(zone.price)}
                    </span>
                    <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>
                      {available}/{zone.total_capacity} {language === 'en' ? 'available' : 'trống'}
                    </span>
                  </div>
                </header>

                <div className="overflow-x-auto p-4">
                  {rowLabels.length === 0 ? (
                    <div className="rounded-md py-8 text-center text-sm" style={{ background: '#F8FAFC', color: '#64748B' }}>
                      {language === 'en' ? 'No seats' : 'Chưa có ghế'}
                    </div>
                  ) : (
                    <div className="min-w-max">
                      {rowLabels.map(rowLabel => {
                        const rowSeats = zoneSeats
                          .filter(seat => seat.row_label === rowLabel)
                          .sort((a, b) => a.seat_number - b.seat_number);

                        return (
                          <div key={rowLabel} className="mb-1.5 flex items-center gap-1.5">
                            <span className="mr-1 w-6 text-center font-mono text-xs font-bold" style={{ color: '#94A3B8' }}>{rowLabel}</span>
                            {rowSeats.map(seat => {
                              const style = seatStyle(seat, zoneColor);
                              const canClick = seat.status === 'available' || seat.status === 'selected';
                              const maxReached = seat.status === 'available' && selectedCount >= maxSelect;

                              return (
                                <button
                                  key={seat.id}
                                  type="button"
                                  aria-label={`${zone.name} ${seat.row_label}${seat.seat_number} ${getSeatStatusLabel(seat.status, language)}`}
                                  className="flex shrink-0 items-center justify-center rounded-[4px] text-[9px] font-bold transition-transform hover:scale-110"
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
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-lg p-4" style={{ background: '#020617', border: '1px solid #0F172A' }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black" style={{ color: '#fff' }}>{language === 'en' ? 'Seat map image' : 'Ảnh sơ đồ ghế'}</h3>
            </div>
            <div className="flex h-96 items-center justify-center overflow-hidden rounded-md" style={{ background: '#030712', border: '1px solid rgba(255,255,255,0.1)' }}>
              {seatMapImageUrl ? (
                <img src={seatMapImageUrl} alt={language === 'en' ? 'Seat map' : 'Sơ đồ ghế'} className="h-full w-full object-contain" />
              ) : (
                <div className="px-6 text-center text-sm font-bold" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  {language === 'en' ? 'No seat map image yet' : 'Chưa có ảnh sơ đồ ghế'}
                </div>
              )}
            </div>
          </div>
        </aside>
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
          <div style={{ color: tooltip.seat.status === 'available' ? '#22C55E' : tooltip.seat.status === 'selected' ? '#F97316' : tooltip.seat.status === 'locked' ? '#F59E0B' : '#94A3B8' }}>
            {getSeatStatusLabel(tooltip.seat.status, language)}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            status: 'available' as const,
            label: getSeatStatusLabel('available', language),
            hint: language === 'en' ? 'Can select' : 'Có thể chọn',
            color: '#38BDF8',
            background: 'rgba(56,189,248,0.18)',
          },
          {
            status: 'selected' as const,
            label: getSeatStatusLabel('selected', language),
            hint: language === 'en' ? 'In your cart' : 'Trong giỏ của bạn',
            color: '#F97316',
            background: '#F97316',
          },
          {
            status: 'locked' as const,
            label: getSeatStatusLabel('locked', language),
            hint: language === 'en' ? 'Held temporarily' : 'Đang được giữ',
            color: '#F59E0B',
            background: '#FEF3C7',
          },
          {
            status: 'sold' as const,
            label: getSeatStatusLabel('sold', language),
            hint: language === 'en' ? 'Unavailable' : 'Không thể chọn',
            color: '#64748B',
            background: '#1E293B',
          },
        ].map(item => (
          <div
            key={item.status}
            className="flex min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <span className="h-4 w-4 shrink-0 rounded-[4px]" style={{ background: item.background, border: `1px solid ${item.color}` }} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{item.label}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.hint}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
