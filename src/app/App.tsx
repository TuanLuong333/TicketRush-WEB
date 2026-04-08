import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './store/AppContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E1E3A',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          },
        }}
      />
    </AppProvider>
  );
}
