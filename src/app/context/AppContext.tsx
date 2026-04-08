import React, { createContext, useContext, useState, useCallback } from 'react';
import { Ticket, SelectedSeat, DEMO_TICKETS } from '../data/mockData';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  avatar?: string;
}

interface CartItem {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  seats: SelectedSeat[];
  lockedUntil: number; // timestamp 10 min from now
}

interface AppContextType {
  user: User | null;
  cart: CartItem | null;
  myTickets: Ticket[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setCart: (cart: CartItem | null) => void;
  checkout: (tickets: Ticket[]) => void;
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DEMO_USERS: User[] = [
  { id: 'u1', name: 'Nguyễn Văn An', email: 'user@ticketrush.vn', role: 'customer', avatar: 'NV' },
  { id: 'u2', name: 'Admin TicketRush', email: 'admin@ticketrush.vn', role: 'admin', avatar: 'AT' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEMO_USERS[0]); // auto-logged in for demo
  const [cart, setCart] = useState<CartItem | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[]>(DEMO_TICKETS);

  const login = useCallback((email: string, _password: string): boolean => {
    const found = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) { setUser(found); return true; }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCart(null);
  }, []);

  const checkout = useCallback((tickets: Ticket[]) => {
    setMyTickets(prev => [...tickets, ...prev]);
    setCart(null);
  }, []);

  return (
    <AppContext.Provider value={{
      user, cart, myTickets,
      login, logout,
      setCart,
      checkout,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
