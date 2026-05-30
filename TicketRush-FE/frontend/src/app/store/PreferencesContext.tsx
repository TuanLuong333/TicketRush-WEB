import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type Language = 'vi' | 'en';

const DICTIONARY = {
  vi: {
    home: 'Trang chủ',
    events: 'Sự kiện',
    myTickets: 'Vé của tôi',
    profile: 'Hồ sơ cá nhân',
    admin: 'Quản trị',
    adminPanel: 'Trang quản trị',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    logout: 'Đăng xuất',
    customerSite: 'Về trang khách hàng',
    administrator: 'Quản trị viên',
    dashboard: 'Tổng quan',
    createEvent: 'Tạo sự kiện',
    orders: 'Đơn hàng',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    languageVi: 'Tiếng Việt',
    languageEn: 'English',
    eventList: 'Danh sách sự kiện',
    eventSearchHint: 'Tra cứu theo tên, địa điểm, trạng thái bán vé và thời gian mở bán.',
    searchEvents: 'Tìm sự kiện, địa điểm hoặc sơ đồ ghế',
    all: 'Tất cả',
    allStatus: 'Tất cả trạng thái',
    upcoming: 'Sắp diễn ra',
    earliestSale: 'Mở bán sớm nhất',
    newest: 'Mới tạo',
    noEvents: 'Không tìm thấy sự kiện',
    clearFilters: 'Xóa bộ lọc',
    latestSale: 'Lần mở bán gần nhất',
    notAvailable: 'Không có',
    queue: 'Hàng chờ',
    queueEnabled: 'Có hàng chờ',
    saleOpen: 'Đang mở bán',
    priceFrom: 'Giá từ',
    available: 'trống',
    seats: 'ghế',
    footerIntro: 'Nền tảng đặt vé sự kiện trực tuyến hàng đầu Việt Nam. Nhanh chóng, an toàn, tiện lợi.',
    support: 'Hỗ trợ',
    company: 'Công ty',
    rights: 'Đã bảo lưu mọi quyền.',
  },
  en: {
    home: 'Home',
    events: 'Events',
    myTickets: 'My tickets',
    profile: 'Profile',
    admin: 'Admin',
    adminPanel: 'Admin panel',
    login: 'Sign in',
    register: 'Sign up',
    logout: 'Sign out',
    customerSite: 'Customer site',
    administrator: 'Administrator',
    dashboard: 'Dashboard',
    createEvent: 'Create event',
    orders: 'Orders',
    themeLight: 'Light',
    themeDark: 'Dark',
    languageVi: 'Vietnamese',
    languageEn: 'English',
    eventList: 'Event list',
    eventSearchHint: 'Search by name, venue, sale status and ticket sale time.',
    searchEvents: 'Search events, venues or seat map',
    all: 'All',
    allStatus: 'All statuses',
    upcoming: 'Upcoming',
    earliestSale: 'Earliest sale',
    newest: 'Newest',
    noEvents: 'No events found',
    clearFilters: 'Clear filters',
    latestSale: 'Latest sale start',
    notAvailable: 'N/A',
    queue: 'Queue',
    queueEnabled: 'Queue enabled',
    saleOpen: 'On sale',
    priceFrom: 'From',
    available: 'available',
    seats: 'seats',
    footerIntro: 'Vietnam online event ticketing platform. Fast, secure and convenient.',
    support: 'Support',
    company: 'Company',
    rights: 'All rights reserved.',
  },
} as const;

type DictionaryKey = keyof typeof DICTIONARY.vi;

interface PreferencesContextValue {
  theme: ThemeMode;
  language: Language;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
  t: (key: DictionaryKey) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readTheme(): ThemeMode {
  const stored = localStorage.getItem('ticketrush-theme');
  return stored === 'dark' ? 'dark' : 'light';
}

function readLanguage(): Language {
  const stored = localStorage.getItem('ticketrush-language');
  return stored === 'en' ? 'en' : 'vi';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readTheme);
  const [language, setLanguageState] = useState<Language>(readLanguage);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ticketrush-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';
    localStorage.setItem('ticketrush-language', language);
  }, [language]);

  const value = useMemo<PreferencesContextValue>(() => ({
    theme,
    language,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState(current => current === 'dark' ? 'light' : 'dark'),
    setLanguage: setLanguageState,
    t: key => DICTIONARY[language][key] ?? DICTIONARY.vi[key],
  }), [language, theme]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
