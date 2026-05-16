import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays, Edit3, Plus, Search, Timer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../store/AppContext';
import { usePreferences } from '../../store/PreferencesContext';
import { getEventStatusLabel } from '../../data/types';
import { formatDateTime, formatPrice, getAutoEventStatus, requiresQueue } from '../../data/mockData';
import { useClockTick } from '../../hooks/useClockTick';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

export default function AdminEventsPage() {
  const { events, getStats, getZones, getQueueLoad, deleteEvent } = useApp();
  const { language, t } = usePreferences();
  const now = useClockTick();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<typeof events[0] | null>(null);

  const filtered = events.filter(event => {
    const value = search.trim().toLowerCase();
    return !value || event.title.toLowerCase().includes(value) || event.location.toLowerCase().includes(value);
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const eventId = deleteTarget.id;
    setLoading(eventId);
    try {
      await deleteEvent(eventId);
      toast.success('Đã xóa sự kiện');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa');
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-black uppercase" style={{ color: '#F97316' }}>{t('events')}</p>
            <h1 className="text-2xl font-black">{language === 'en' ? 'Manage Events' : 'Quản lý sự kiện'}</h1>
          </div>
          <Link to="/admin/events/new" className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-bold text-white" style={{ background: '#F97316' }}>
            <Plus size={17} /> {language === 'en' ? 'Create Event' : 'Tạo sự kiện'}
          </Link>
        </div>
      </header>

      <div className="p-6">
        <div className="relative mb-5 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={language === 'en' ? 'Search by name or venue' : 'Tìm theo tên sự kiện hoặc địa điểm'}
            className="w-full rounded-md py-3 pl-9 pr-3 text-sm outline-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-orange-500"
          />
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {[(language === 'en' ? 'Event Name' : 'Tên sự kiện'), (language === 'en' ? 'Time' : 'Thời gian'), (language === 'en' ? 'Location' : 'Địa điểm'), (language === 'en' ? 'Zones' : 'Khu ghế'), (language === 'en' ? 'Seats' : 'Ghế'), (language === 'en' ? 'Revenue' : 'Doanh thu'), (language === 'en' ? 'Status' : 'Trạng thái'), (language === 'en' ? 'Action' : 'Thao tác')].map(head => (
                    <th key={head} className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(event => {
                  const stats = getStats(event.id);
                  const zones = getZones(event.id);
                  const status = getAutoEventStatus(event, stats, now);
                  const isLoading = loading === event.id;
                  return (
                    <tr key={event.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={event.banner_url} alt={event.title} className="h-11 w-11 rounded-md object-cover" />
                          <div>
                            <div className="font-black">{event.title}</div>
                            <div className="font-mono text-xs" style={{ color: '#64748B' }}>#{event.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold"><CalendarDays size={14} className="text-orange-500" /> {formatDateTime(event.event_time)}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{language === 'en' ? 'Sale ends' : 'Mở bán đến'} {formatDateTime(event.sale_end_time)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {event.location}
                      </td>
                      <td className="px-4 py-3">{zones.length} {language === 'en' ? 'zones' : 'khu'}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{stats.sold}/{stats.total_capacity}</div>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-full rounded-full" style={{ width: `${stats.occupancy_pct}%`, background: stats.occupancy_pct >= 80 ? '#F97316' : '#0EA5E9' }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-500">{formatPrice(stats.revenue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`rounded-md px-2 py-1 text-xs font-black ${status === 'on_sale' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {getEventStatusLabel(status, language)}
                          </span>
                          {requiresQueue(event, stats, getQueueLoad(event.id)) && <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-black bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"><Timer size={12} /> {t('queue')}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link to={`/admin/events/${event.id}/edit`} className="inline-flex rounded-md p-2" style={{ background: '#E0F2FE', color: '#0369A1' }} title={language === 'en' ? 'Edit' : 'Sửa'}>
                            <Edit3 size={16} />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(event)}
                            disabled={isLoading}
                            className="inline-flex rounded-md p-2"
                            style={{ background: '#FEF2F2', color: '#DC2626' }}
                            title={language === 'en' ? 'Delete' : 'Xóa'}
                          >
                            {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'en' ? 'Delete event?' : 'Xóa sự kiện?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'en'
                ? `This will remove "${deleteTarget?.title ?? ''}" from the admin event list.`
                : `Thao tác này sẽ xóa "${deleteTarget?.title ?? ''}" khỏi danh sách sự kiện.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'en' ? 'Cancel' : 'Hủy'}</AlertDialogCancel>
            <AlertDialogAction onClick={event => {
              event.preventDefault();
              void handleDelete();
            }} className="bg-red-600 text-white hover:bg-red-700">
              {language === 'en' ? 'Delete' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
