import { Link } from 'react-router';
import { Zap, Github, Twitter, Facebook, Instagram, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{ background: '#0D0D1F', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3A8C)' }}>
                <Zap size={16} className="text-white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Ticket<span style={{ color: '#FF6B35' }}>Rush</span>
              </span>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              Nền tảng đặt vé sự kiện trực tuyến hàng đầu Việt Nam. Nhanh chóng, an toàn, tiện lợi.
            </p>
            <div className="flex gap-3 mt-4">
              {[Facebook, Instagram, Twitter, Github].map((Icon, i) => (
                <button key={i}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            {
              title: 'Sự kiện',
              links: ['Nhạc Pop', 'Rock & Metal', 'Jazz & Blues', 'Hip-hop & Rap', 'Electronic'],
            },
            {
              title: 'Hỗ trợ',
              links: ['Hướng dẫn đặt vé', 'Chính sách hoàn vé', 'FAQ', 'Liên hệ', 'Báo lỗi'],
            },
            {
              title: 'Công ty',
              links: ['Về chúng tôi', 'Tuyển dụng', 'Đối tác', 'Blog', 'Điều khoản'],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold" style={{ color: '#fff' }}>{title}</h4>
              <ul className="space-y-2">
                {links.map(link => {
                  let to = '/';
                  if (title === 'Sự kiện') {
                    const genreMap: Record<string, string> = {
                      'Nhạc Pop': 'Pop',
                      'Rock & Metal': 'Rock',
                      'Jazz & Blues': 'Jazz',
                      'Hip-hop & Rap': 'Rap',
                      'Electronic': 'Electronic'
                    };
                    to = `/events?genre=${genreMap[link] || 'Tất cả'}`;
                  }
                  return (
                    <li key={link}>
                      <Link to={to} className="text-sm transition-colors hover:text-white"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {link}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © 2026 TicketRush. All rights reserved. • INT3306 Spring 2026
          </p>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <Mail size={12} />
            support@ticketrush.vn
          </div>
        </div>
      </div>
    </footer>
  );
}
