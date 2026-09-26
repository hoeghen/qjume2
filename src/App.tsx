import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth.js';
import { AppHeader } from './components/AppHeader.js';
import { LanguageProvider } from './lib/i18n/LanguageContext.js';
import { detectLocaleFromPath } from './lib/i18n/locale.js';

export function App() {
  // Read from the URL rather than carried as route data: the same `App`
  // element is mounted once for both the unprefixed (English) and `/da`
  // branches of the route tree (see router.tsx), so this is the one place
  // that tells the two apart.
  const locale = detectLocaleFromPath(useLocation().pathname);

  return (
    <AuthProvider>
      <LanguageProvider locale={locale}>
        <div className="app">
          <AppHeader />
          <Outlet />
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}
