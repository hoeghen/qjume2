import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth.js';
import { InstallPrompt } from './components/InstallPrompt.js';

export function App() {
  const { pathname } = useLocation();
  // The install prompt is for customers: staff run this on a shop tablet, and
  // shop mode does not depend on push at all.
  const isShop = pathname.startsWith('/shop');

  return (
    <AuthProvider>
      <div className="app">
        {!isShop && <InstallPrompt />}
        <Outlet />
      </div>
    </AuthProvider>
  );
}
