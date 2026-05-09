import { Ticket } from 'lucide-react';

type BrandLogoSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  size?: BrandLogoSize;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

const SIZE_MAP = {
  sm: { mark: 'h-9 w-9', icon: 18, text: 'text-lg' },
  md: { mark: 'h-10 w-10', icon: 21, text: 'text-xl' },
  lg: { mark: 'h-14 w-14', icon: 29, text: 'text-2xl' },
};

const joinClasses = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export function BrandLogo({ size = 'md', showText = true, className, textClassName }: BrandLogoProps) {
  const config = SIZE_MAP[size];

  return (
    <div className={joinClasses('flex items-center gap-2.5', className)} aria-label="TicketRush">
      <div
        className={joinClasses('relative isolate flex shrink-0 items-center justify-center overflow-hidden', config.mark)}
        style={{
          background: 'linear-gradient(135deg, #FF7A1A 0%, #FF3D71 52%, #7C3AED 100%)',
          boxShadow: '0 12px 28px rgba(249, 115, 22, 0.32)',
          clipPath: 'polygon(12% 0, 100% 0, 100% 34%, 88% 50%, 100% 66%, 100% 100%, 12% 100%, 0 86%, 0 14%)',
        }}
      >
        <span
          className="absolute inset-x-1 top-1 h-px rounded-full"
          style={{ background: 'rgba(255,255,255,0.5)' }}
        />
        <Ticket size={config.icon} strokeWidth={2.7} className="relative z-10 text-white" />
      </div>
      {showText && (
        <span
          className={joinClasses('font-black leading-none tracking-normal text-white', config.text, textClassName)}
        >
          Ticket<span style={{ color: '#FF7A1A' }}>Rush</span>
        </span>
      )}
    </div>
  );
}
