import { useState } from 'react';
import { PRICE_TIER_CONFIG } from '../data/types';
import type { EventSeat, VenueSection } from '../data/types';
import { formatPrice } from '../data/mockData';

interface SeatMapProps {
  eventId: string;
  sections: VenueSection[];         // replaces ZoneConfig[]
  seats: EventSeat[];               // replaces SeatInfo[]
  onSeatClick: (seat: EventSeat) => void;
  maxSelect?: number;
}

interface TooltipState {
  seat: EventSeat;
  x: number;
  y: number;
}

export function SeatMap({ sections, seats, onSeatClick, maxSelect = 8 }: SeatMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const selectedCount = seats.filter(s => s.status === 'selected').length;

  return (
    <div className="relative select-none">
      {/* Stage */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="px-16 py-3 rounded-full text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(255,107,53,0.3), rgba(255,58,140,0.3))',
              border: '1px solid rgba(255,107,53,0.4)',
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.25em',
              boxShadow: '0 0 30px rgba(255,107,53,0.2)',
            }}>
            ✦ SÂN KHẤU ✦
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(255,107,53,0.3), transparent)', filter: 'blur(8px)' }} />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {sections.map(section => {
          const tierConfig = PRICE_TIER_CONFIG[section.price_tier];
          const sectionSeats = seats.filter(s => s.section_name === section.section_name);
          const sectionAvailable = sectionSeats.filter(s => s.status === 'available').length;
          const sectionTotal = sectionSeats.length;

          // Group seats by row_label
          const rowLabels = [...new Set(sectionSeats.map(s => s.row_label))].sort();

          return (
            <div key={section.section_name} className="rounded-xl overflow-hidden"
              style={{
                background: activeSection === section.section_name ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeSection === section.section_name ? section.color + '40' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.3s',
              }}
              onMouseEnter={() => setActiveSection(section.section_name)}
              onMouseLeave={() => setActiveSection(null)}>

              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: section.color }} />
                  <span className="text-sm font-semibold" style={{ color: '#fff' }}>
                    {section.section_name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: section.color + '20', color: section.color }}>
                    {formatPrice(section.price)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    {tierConfig.label}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span style={{ color: '#10B981' }}>{sectionAvailable}</span> / {sectionTotal} trống
                </span>
              </div>

              {/* Seats grid — grouped by row_label */}
              <div className="p-4 overflow-x-auto">
                <div className="min-w-max mx-auto">
                  {rowLabels.map(rowLabel => {
                    const rowSeats = sectionSeats
                      .filter(s => s.row_label === rowLabel)
                      .sort((a, b) => a.seat_number - b.seat_number);

                    return (
                      <div key={rowLabel} className="flex items-center gap-0.5 mb-0.5">
                        <span className="text-xs w-5 text-center mr-1 font-mono"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {rowLabel}
                        </span>
                        {rowSeats.map(seat => {
                          const isClickable = seat.status === 'available' || seat.status === 'selected';
                          const isMaxReached = seat.status === 'available' && selectedCount >= maxSelect;

                          const bgColor = seat.status === 'selected'
                            ? '#FF6B35'
                            : seat.status === 'available'
                              ? section.color + '30'
                              : seat.status === 'locked'
                                ? '#2D3748'
                                : '#1a1a2e';

                          const borderColor = seat.status === 'selected'
                            ? '#FF6B35'
                            : seat.status === 'available'
                              ? section.color
                              : seat.status === 'locked'
                                ? '#4B5563'
                                : '#2a2a40';

                          const statusLabel =
                            seat.status === 'available' ? 'Còn trống' :
                            seat.status === 'selected'  ? 'Đã chọn' :
                            seat.status === 'locked'    ? 'Đang giữ' : 'Đã bán';

                          return (
                            <div
                              key={seat.id}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 3,
                                background: bgColor,
                                border: `1px solid ${borderColor}`,
                                cursor: isClickable && !isMaxReached ? 'pointer' : isMaxReached ? 'not-allowed' : 'default',
                                opacity: isMaxReached ? 0.35 : 1,
                                transform: seat.status === 'selected' ? 'scale(1.15)' : 'scale(1)',
                                boxShadow: seat.status === 'selected' ? '0 0 8px rgba(255,107,53,0.6)' : 'none',
                                transition: 'all 0.12s',
                                flexShrink: 0,
                              }}
                              title={`${section.section_name} • Hàng ${seat.row_label}, Ghế ${seat.seat_number} • ${formatPrice(seat.price)} • ${statusLabel}`}
                              onClick={() => {
                                if (isClickable && !isMaxReached) onSeatClick(seat);
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({ seat, x: rect.left + rect.width / 2, y: rect.top });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y - 72,
            transform: 'translateX(-50%)',
            background: '#1E1E3A',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}>
          <div className="font-semibold">
            {tooltip.seat.section_name} — Hàng {tooltip.seat.row_label}, Ghế {tooltip.seat.seat_number}
          </div>
          <div style={{ color: '#FF6B35' }}>{formatPrice(tooltip.seat.price)}</div>
          <div style={{
            color: tooltip.seat.status === 'available' ? '#10B981' :
              tooltip.seat.status === 'selected' ? '#FF6B35' :
              tooltip.seat.status === 'locked' ? '#F59E0B' : '#6B7280'
          }}>
            ● {tooltip.seat.status === 'available' ? 'Còn trống' :
               tooltip.seat.status === 'selected' ? 'Đã chọn' :
               tooltip.seat.status === 'locked' ? 'Đang được giữ' : 'Đã bán'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {PRICE_TIER_CONFIG[tooltip.seat.price_tier].label}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {[
          { color: '#3B82F6', label: 'Còn trống', bg: '#3B82F630' },
          { color: '#FF6B35', label: 'Đang chọn', bg: '#FF6B35' },
          { color: '#F59E0B', label: 'Đang giữ (người khác)', bg: '#2D3748' },
          { color: '#4B5563', label: 'Đã bán', bg: '#1a1a2e' },
        ].map(({ color, label, bg }) => (
          <div key={label} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1px solid ${color}`, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
