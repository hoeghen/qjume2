import { Outlet } from 'react-router-dom';
import { InstallPrompt } from './components/InstallPrompt.js';

export function App() {
  return (
    <div className="app">
      <InstallPrompt />
      <Outlet />
    </div>
  );
}
