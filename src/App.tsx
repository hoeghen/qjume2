import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth.js';
import { AppHeader } from './components/AppHeader.js';
import { LanguageProvider } from './lib/i18n/LanguageContext.js';
import { detectLocaleFromPath } from './lib/i18n/locale.js';

export function App() {
  // Read from the URL rather than carried as route data: the same `App`
  // element is mounted once for every branch of the route tree — unprefixed
  // (Danish), `/en` and the old `/da` (see router.tsx) — so this is the one
  // place that tells them apart.
  const locale = detectLocaleFromPath(useLocation().pathname);
  // Screen readers and the browser's own translation offer read this.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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
