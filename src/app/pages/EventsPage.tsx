import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Search, Filter, MapPin, Calendar, Music, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { EventCard } from '../components/EventCard';

const CITIES = ['Tất cả', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'];
const GENRES = ['Tất cả', 'Pop', 'Rock', 'Jazz', 'Rap', 'Ballad', 'Electronic'];

export default function EventsPage() {
  const { events } = useApp();
  const [searchParams] = useSearchParams();
  
  const [search, setSearch] = useState('');
  const [city, setCity] = useState(searchParams.get('city') || 'Tất cả');
  const [genre, setGenre] = useState(searchParams.get('genre') || 'Tất cả');
  const [sortBy, setSortBy] = useState('newest');

  // Update filters if search params change
  useEffect(() => {
    const qCity = searchParams.get('city');
    const qGenre = searchParams.get('genre');
    if (qCity) setCity(qCity);
    if (qGenre) setGenre(qGenre);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = events.filter(e => {
      const matchSearch = !search || 
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.artist.toLowerCase().includes(search.toLowerCase());
      const matchCity = city === 'Tất cả' || e.city === city;
      const matchGenre = genre === 'Tất cả' || e.genres.includes(genre);
      return matchSearch && matchCity && matchGenre;
    });

    if (sortBy === 'newest') result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sortBy === 'soonest') result.sort((a, b) => a.date_start.localeCompare(b.date_start));
    
    return result;
  }, [events, search, city, genre, sortBy]);

  return (
    <div style={{ background: '#08081A', minHeight: '100vh', color: '#fff' }}>
      {/* Search Header */}
      <div style={{ background: 'linear-gradient(to bottom, #12122A, #08081A)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ letterSpacing: '-0.02em' }}>
            Khám Phá <span style={{ color: '#FF6B35' }}>Sự Kiện</span>
          </h1>
          <p className="max-w-xl mx-auto text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Tìm kiếm những đêm nhạc, lễ hội và trải nghiệm nghệ thuật tuyệt vời nhất dành riêng cho bạn.
          </p>

          <div className="max-w-3xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={20} />
            <input 
              type="text"
              placeholder="Tìm tên sự kiện, nghệ sĩ hoặc địa điểm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-base outline-none transition-all focus:ring-2 focus:ring-[#FF6B35]/50"
              style={{
                background: '#1A1A35',
                border: '1px solid rgba(255,107,53,0.2)',
                color: '#fff',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-10 p-4 rounded-2xl" 
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <MapPin size={16} className="text-[#FF6B35]" />
              <select 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                className="bg-transparent text-sm outline-none cursor-pointer pr-2"
                style={{ appearance: 'none' }}
              >
                {CITIES.map(c => <option key={c} value={c} className="bg-[#12122A]">{c}</option>)}
              </select>
              <ChevronDown size={14} className="opacity-30" />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Music size={16} className="text-[#FF6B35]" />
              <select 
                value={genre} 
                onChange={(e) => setGenre(e.target.value)}
                className="bg-transparent text-sm outline-none cursor-pointer pr-2"
                style={{ appearance: 'none' }}
              >
                {GENRES.map(g => <option key={g} value={g} className="bg-[#12122A]">{g}</option>)}
              </select>
              <ChevronDown size={14} className="opacity-30" />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors hover:bg-white/10" 
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>
              <Calendar size={16} /> Ngày tháng
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-xs uppercase tracking-wider opacity-40 font-bold">Sắp xếp:</span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <SlidersHorizontal size={14} className="opacity-40" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-sm outline-none cursor-pointer"
                style={{ appearance: 'none' }}
              >
                <option value="newest" className="bg-[#12122A]">Mới nhất</option>
                <option value="soonest" className="bg-[#12122A]">Sắp diễn ra</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            Những sự kiện dành cho bạn
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,107,53,0.2)', color: '#FF6B35' }}>
              {filtered.length} KẾT QUẢ
            </span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="py-32 text-center rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Search size={64} className="mx-auto mb-6 opacity-10" />
            <h3 className="text-lg font-bold opacity-60">Không tìm thấy sự kiện nào</h3>
            <p className="text-sm opacity-40 mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
            <button 
              onClick={() => {setSearch(''); setCity('Tất cả'); setGenre('Tất cả');}}
              className="mt-6 text-sm font-bold text-[#FF6B35] hover:underline"
            >
              Thiết lập lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(e => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
