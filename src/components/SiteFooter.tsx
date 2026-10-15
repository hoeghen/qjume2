import { useLocation } from 'react-router-dom';
import { COMPANY, COMPANY_LINE } from '../lib/company.js';
import { LocalizedLink } from '../lib/i18n/LocalizedLink.js';
import { useT } from '../lib/i18n/LanguageContext.js';
import { stripLocale } from '../lib/i18n/locale.js';

/**
 * Company details and the legal links, on every page — e-handelsloven § 7
 * wants them "permanently" reachable, not one tap behind a menu. Quiet, at
 * the bottom of the ink. Left off the monitor: it is a screen on a shop's
 * wall, read from across the room, not a page anyone browses.
 */
export function SiteFooter() {
  const { t } = useT();
  const path = stripLocale(useLocation().pathname);
  if (path === '/monitor' || path.startsWith('/monitor/')) return null;

  return (
    <footer className="site-footer">
      <nav className="site-footer-links">
        <LocalizedLink to="/contact">{t('footer.contact')}</LocalizedLink>
        <LocalizedLink to="/terms">{t('footer.terms')}</LocalizedLink>
        <LocalizedLink to="/privacy">{t('footer.privacy')}</LocalizedLink>
      </nav>
      <p>
        {COMPANY_LINE} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
    </footer>
  );
}
