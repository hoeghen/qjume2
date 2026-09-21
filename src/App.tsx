import { Outlet } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth.js';

export function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Outlet />
      </div>
    </AuthProvider>
  );
}
