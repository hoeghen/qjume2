import { COMPANY, COMPANY_ADDRESS } from '../../lib/company.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

/**
 * Who runs Qjume and how to reach them — the company details e-handelsloven
 * requires, on a page of their own and linked from
 * the ☰ menu on every page as "Info". Worded from `COMPANY`, so it cannot
 * disagree with the terms.
 */
export function Info() {
  const { t } = useT();
  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>{t('contact.title')}</h1>
      </div>

      <div className="legal">
        <p>{t('contact.intro', { company: COMPANY.name })}</p>

        <dl className="contact-details">
          <dt>{t('contact.company')}</dt>
          <dd>{COMPANY.name}</dd>
          <dt>{t('contact.cvr')}</dt>
          <dd>{COMPANY.cvr}</dd>
          <dt>{t('contact.address')}</dt>
          <dd>
            {COMPANY_ADDRESS}
            <br />
            {COMPANY.country}
          </dd>
          <dt>{t('contact.email')}</dt>
          <dd>
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </dd>
        </dl>

        <p>{t('contact.reply')}</p>
        <p>
          <LocalizedLink to="/terms">{t('contact.terms')}</LocalizedLink>
          {' · '}
          <LocalizedLink to="/privacy">{t('contact.privacy')}</LocalizedLink>
        </p>
      </div>
    </main>
  );
}
