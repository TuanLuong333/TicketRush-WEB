import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './store/AppContext';
import { PreferencesProvider } from './store/PreferencesContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <PreferencesProvider>
      <AppProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
            },
          }}
        />
      </AppProvider>
    </PreferencesProvider>
  );
}
