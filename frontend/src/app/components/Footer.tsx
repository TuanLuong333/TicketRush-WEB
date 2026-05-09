import { Link } from 'react-router';
import { Github, Twitter, Facebook, Instagram, Mail } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { usePreferences } from '../store/PreferencesContext';

export function Footer() {
  const { language, t } = usePreferences();
  const genreLinks = language === 'en'
    ? [
      { label: 'Pop', genre: 'pop' },
      { label: 'Rock & Metal', genre: 'rock' },
      { label: 'Jazz & Blues', genre: 'jazz' },
      { label: 'Hip-hop & Rap', genre: 'rap' },
      { label: 'Electronic', genre: 'electronic' },
    ]
    : [
      { label: 'Nhạc Pop', genre: 'pop' },
      { label: 'Rock & Metal', genre: 'rock' },
      { label: 'Jazz & Blues', genre: 'jazz' },
      { label: 'Hip-hop & Rap', genre: 'rap' },
      { label: 'Electronic', genre: 'electronic' },
    ];
  const supportLinks = language === 'en'
    ? ['Booking guide', 'Refund policy', 'FAQ', 'Contact', 'Report issue']
    : ['Hướng dẫn đặt vé', 'Chính sách hoàn vé', 'FAQ', 'Liên hệ', 'Báo lỗi'];
  const companyLinks = language === 'en'
    ? ['About us', 'Careers', 'Partners', 'Blog', 'Terms']
    : ['Về chúng tôi', 'Tuyển dụng', 'Đối tác', 'Blog', 'Điều khoản'];

  return (
    <footer style={{ background: '#0D0D1F', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <BrandLogo size="sm" />
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              {t('footerIntro')}
            </p>
            <div className="flex gap-3 mt-4">
              {[Facebook, Instagram, Twitter, Github].map((Icon, i) => (
                <a key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            {
              title: t('events'),
              links: genreLinks,
            },
            {
              title: t('support'),
              links: supportLinks,
            },
            {
              title: t('company'),
              links: companyLinks,
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold" style={{ color: '#fff' }}>{title}</h4>
              <ul className="space-y-2">
                {links.map(link => {
                  if (typeof link === 'object') {
                    return (
                      <li key={link.genre}>
                        <Link to={`/events?genre=${link.genre}`} className="text-sm transition-colors hover:text-white"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {link.label}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={link}>
                      <a href="#" className="text-sm transition-colors hover:text-white"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {link}
                      </a>
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
            © 2026 TicketRush. {t('rights')} • INT3306 Spring 2026
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
