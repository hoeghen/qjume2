import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/hooks/useAuth.js';
import { AppHeader } from './components/AppHeader.js';
import { LanguageProvider } from './lib/i18n/LanguageContext.js';
import { detectLocaleFromPath, stripLocale } from './lib/i18n/locale.js';
import { applyPageMeta, defaultPageMeta } from './lib/pageMeta.js';
import { SEO_PAGES } from './lib/seo.js';

export function App() {
  // Read from the URL rather than carried as route data: the same `App`
  // element is mounted once for every branch of the route tree — unprefixed
  // (Danish), `/en` and the old `/da` (see router.tsx) — so this is the one
  // place that tells them apart.
  const { pathname } = useLocation();
  const locale = detectLocaleFromPath(pathname);
  // Screen readers and the browser's own translation offer read this.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Title, description and the rest of the head (src/lib/seo.ts). A shop's
  // own page words its head itself, from the shop's name — and a child's
  // effect runs before this one, so this must leave that page alone.
  useEffect(() => {
    const path = stripLocale(pathname);
    if (path.startsWith('/s/')) return;
    applyPageMeta(path, locale, SEO_PAGES[path]?.[locale] ?? defaultPageMeta(locale));
  }, [pathname, locale]);

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
