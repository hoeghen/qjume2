import { Outlet } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth.js';
import { DemoBanner } from './components/DemoBanner.js';

export function App() {
  return (
    <AuthProvider>
      <div className="app">
        <DemoBanner />
        <Outlet />
      </div>
    </AuthProvider>
  );
}
