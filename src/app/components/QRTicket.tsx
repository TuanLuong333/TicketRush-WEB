import { generateQRMatrix } from '../data/mockData';

interface QRTicketProps {
  ticketId: string;
  size?: number;
}

export function QRCode({ ticketId, size = 120 }: QRTicketProps) {
  const matrix = generateQRMatrix(ticketId);
  const cellSize = size / matrix.length;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      style={{ imageRendering: 'pixelated' }}
    >
      <rect width={size} height={size} fill="white" />
      {matrix.map((row, ri) =>
        row.map((cell, ci) =>
          cell ? (
            <rect
              key={`${ri}-${ci}`}
              x={ci * cellSize}
              y={ri * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#000"
            />
          ) : null
        )
      )}
    </svg>
  );
}

interface TicketCardProps {
  ticket: import('../data/mockData').Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const eventDate = new Date(ticket.eventDate + 'T' + ticket.eventTime);
  const dateStr = eventDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const zoneColor: Record<string, string> = {
    vip: '#f59e0b',
    premium: '#8b5cf6',
    standard: '#06b6d4',
    economy: '#22c55e',
  };
  const color = zoneColor[ticket.zone] || '#8b5cf6';

  return (
    <div className="bg-[#1a1a2e] rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group">
      {/* Top image */}
      <div className="relative h-28 overflow-hidden">
        <img
          src={ticket.eventImage}
          alt={ticket.eventTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e]/40 to-transparent" />
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs text-white"
          style={{ backgroundColor: color + '33', border: `1px solid ${color}55`, color, fontWeight: 600 }}
        >
          {ticket.zoneName}
        </div>
        {ticket.status === 'active' && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" style={{ fontWeight: 600 }}>
            ● Hợp lệ
          </div>
        )}
      </div>

      {/* Ticket body */}
      <div className="p-4">
        <h3 className="text-white text-sm mb-1 line-clamp-1" style={{ fontWeight: 700 }}>
          {ticket.eventTitle}
        </h3>
        <p className="text-slate-400 text-xs mb-3 line-clamp-1">
          {dateStr} · {ticket.eventTime}
        </p>

        {/* Dashed divider */}
        <div className="relative my-3">
          <div className="border-t border-dashed border-white/10" />
          <div className="absolute -left-4 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0b0b14]" style={{ top: '50%' }} />
          <div className="absolute -right-4 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0b0b14]" style={{ top: '50%' }} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2">
            <InfoRow label="Ghế" value={`Hàng ${ticket.row}, Ghế ${ticket.col}`} />
            <InfoRow label="Khu vực" value={ticket.zoneName} color={color} />
            <InfoRow label="Mã vé" value={ticket.id} mono />
            <InfoRow
              label="Giá"
              value={new Intl.NumberFormat('vi-VN').format(ticket.price) + 'đ'}
              color={color}
            />
          </div>

          {/* QR Code */}
          <div className="flex-shrink-0 p-2 bg-white rounded-xl">
            <QRCode ticketId={ticket.id} size={80} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
      <p
        className="text-sm"
        style={{
          fontFamily: mono ? 'monospace' : undefined,
          color: color || 'white',
          fontWeight: color ? 600 : 400,
        }}
      >
        {value}
      </p>
    </div>
  );
}
