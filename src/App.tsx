import { Outlet } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth.js';
import { AppHeader } from './components/AppHeader.js';

export function App() {
  return (
    <AuthProvider>
      <div className="app">
        <AppHeader />
        <Outlet />
      </div>
    </AuthProvider>
  );
}
