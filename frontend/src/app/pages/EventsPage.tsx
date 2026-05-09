import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Calendar, ChevronDown, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { usePreferences } from '../store/PreferencesContext';
import { EventCard } from '../components/EventCard';
import { getEventStatusLabel } from '../data/types';
import type { EventStatus } from '../data/types';
import { formatDate, getAutoEventStatus, getEventCity } from '../data/mockData';
import { useClockTick } from '../hooks/useClockTick';

const STATUS_OPTIONS: Array<EventStatus | 'all'> = ['all', 'on_sale', 'draft', 'paused', 'sold_out', 'ended', 'cancelled'];
const SORT_OPTIONS = ['soonest', 'sale', 'newest'] as const;
type SortOption = typeof SORT_OPTIONS[number];
type FilterMenuId = 'city' | 'status' | 'sort';

const GENRE_FILTERS: Record<string, { label: string; labelEn: string; keywords: string[] }> = {
  pop: { label: 'Nhạc Pop', labelEn: 'Pop', keywords: ['pop', 'sky', 'heartbeat', 'gala', 'live'] },
  rock: { label: 'Rock & Metal', labelEn: 'Rock & Metal', keywords: ['rock', 'metal', 'storm'] },
  jazz: { label: 'Jazz & Blues', labelEn: 'Jazz & Blues', keywords: ['jazz', 'blues', 'river'] },
  rap: { label: 'Hip-hop & Rap', labelEn: 'Hip-hop & Rap', keywords: ['rap', 'hip-hop', 'hiphop', 'sky'] },
  electronic: { label: 'Electronic', labelEn: 'Electronic', keywords: ['electronic', 'edm', 'festival', 'outdoor'] },
};

interface FilterOption {
  value: string;
  label: string;
}

interface ArrowDropdownProps {
  id: FilterMenuId;
  icon: LucideIcon;
  value: string;
  options: FilterOption[];
  open: boolean;
  minWidth?: number;
  onToggle: (id: FilterMenuId) => void;
  onChange: (value: string) => void;
}

function ArrowDropdown({ id, icon: Icon, value, options, open, minWidth = 200, onToggle, onChange }: ArrowDropdownProps) {
  const selected = options.find(option => option.value === value) ?? options[0];

  return (
    <div className="relative inline-flex items-center gap-2 rounded-md px-3 py-2" style={{ background: '#F1F5F9', color: '#334155', minWidth }}>
      <Icon size={16} style={{ color: id === 'sort' ? '#64748B' : '#F97316' }} />
      <span className="flex-1 select-none text-sm font-medium">{selected?.label}</span>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white"
        style={{ color: '#94A3B8' }}
        aria-label={`Mở bộ lọc ${selected?.label}`}
        aria-expanded={open}
      >
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-md"
          style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 18px 44px rgba(15,23,42,0.12)' }}
        >
          {options.map(option => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className="block w-full px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-[#FFF7ED]"
                style={{ color: active ? '#C2410C' : '#334155', background: active ? '#FFF7ED' : '#fff' }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const { events, getStats } = useApp();
  const { language, t } = usePreferences();
  const now = useClockTick();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Tất cả');
  const [status, setStatus] = useState<EventStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('soonest');
  const [openMenu, setOpenMenu] = useState<FilterMenuId | null>(null);

  const cities = useMemo(() => ['Tất cả', ...Array.from(new Set(events.map(getEventCity)))], [events]);
  const genreParam = (searchParams.get('genre') ?? '').toLowerCase();
  const genreFilter = GENRE_FILTERS[genreParam];
  const cityOptions = useMemo(() => cities.map(item => ({ value: item, label: item === 'Tất cả' ? t('all') : item })), [cities, t]);
  const statusOptions = useMemo(
    () => STATUS_OPTIONS.map(item => ({ value: item, label: item === 'all' ? t('allStatus') : getEventStatusLabel(item, language) })),
    [language, t],
  );
  const sortOptions = useMemo(
    () => [
      { value: 'soonest', label: t('upcoming') },
      { value: 'sale', label: t('earliestSale') },
      { value: 'newest', label: t('newest') },
    ],
    [t],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!filtersRef.current || !(event.target instanceof Node)) return;
      if (!filtersRef.current.contains(event.target)) setOpenMenu(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const result = events.filter(event => {
      const haystack = `${event.title} ${event.description} ${event.location} ${event.seat_plan}`.toLowerCase();
      const matchesSearch =
        !normalized ||
        haystack.includes(normalized);
      const matchesGenre =
        !genreFilter ||
        genreFilter.keywords.some(keyword => haystack.includes(keyword));
      const matchesCity = city === 'Tất cả' || getEventCity(event) === city;
      const matchesStatus = status === 'all' || getAutoEventStatus(event, getStats(event.id), now) === status;
      return matchesSearch && matchesGenre && matchesCity && matchesStatus;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'newest') return b.created_at.localeCompare(a.created_at);
      if (sortBy === 'sale') return a.sale_start_time.localeCompare(b.sale_start_time);
      return a.event_time.localeCompare(b.event_time);
    });
  }, [city, events, genreFilter, getStats, now, search, sortBy, status]);

  const toggleMenu = (id: FilterMenuId) => setOpenMenu(current => current === id ? null : id);
  const clearGenre = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('genre');
    setSearchParams(next, { replace: true });
  };

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <section style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-wider" style={{ color: '#F97316' }}>{t('events')}</p>
              <h1 className="text-3xl font-black md:text-4xl">{t('eventList')}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: '#64748B' }}>
                {t('eventSearchHint')}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={20} style={{ color: '#94A3B8' }} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={t('searchEvents')}
                className="w-full rounded-lg py-4 pl-12 pr-4 text-base outline-none"
                style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A' }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div ref={filtersRef} className="mb-8 flex flex-col gap-3 rounded-lg p-4 md:flex-row md:items-center md:justify-between" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <div className="flex flex-wrap gap-3">
            <ArrowDropdown
              id="city"
              icon={MapPin}
              value={city}
              options={cityOptions}
              open={openMenu === 'city'}
              minWidth={200}
              onToggle={toggleMenu}
              onChange={value => {
                setCity(value);
                setOpenMenu(null);
              }}
            />

            <ArrowDropdown
              id="status"
              icon={Calendar}
              value={status}
              options={statusOptions}
              open={openMenu === 'status'}
              minWidth={286}
              onToggle={toggleMenu}
              onChange={value => {
                setStatus(value as EventStatus | 'all');
                setOpenMenu(null);
              }}
            />
          </div>

          <ArrowDropdown
            id="sort"
            icon={SlidersHorizontal}
            value={sortBy}
            options={sortOptions}
            open={openMenu === 'sort'}
            minWidth={268}
            onToggle={toggleMenu}
            onChange={value => {
              setSortBy(value as SortOption);
              setOpenMenu(null);
            }}
          />
        </div>

        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">{filtered.length} {language === 'en' ? 'events' : 'sự kiện'}</h2>
            {genreFilter && (
              <button
                onClick={clearGenre}
                className="mt-2 rounded-md px-3 py-1.5 text-sm font-bold"
                style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
              >
                {language === 'en' ? genreFilter.labelEn : genreFilter.label}
              </button>
            )}
          </div>
          <span className="hidden text-sm md:inline" style={{ color: '#64748B' }}>
            {t('latestSale')}: {filtered[0] ? formatDate(filtered[0].sale_start_time) : t('notAvailable')}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <div className="rounded-lg py-20 text-center" style={{ background: '#fff', border: '1px dashed #CBD5E1' }}>
            <Search size={46} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
            <h3 className="text-lg font-black">{t('noEvents')}</h3>
            <button
              onClick={() => {
                setSearch('');
                setCity('Tất cả');
                setStatus('all');
                setSearchParams({}, { replace: true });
              }}
              className="mt-4 rounded-md px-4 py-2 text-sm font-bold"
              style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
