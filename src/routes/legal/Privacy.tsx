import { useT } from '../../lib/i18n/LanguageContext.js';

/**
 * A first draft, not a finished legal document — reviewed by no lawyer yet.
 * Describes what the app actually collects (see the Ticket/TicketContact
 * split in src/types/ticket.ts, and useGeolocation) rather than a generic
 * template, so it can't drift into claiming more or less than the code does.
 *
 * The Danish translation is a first draft in the same sense as the English
 * text it mirrors — not lawyer-reviewed.
 */
export function Privacy() {
  const { t } = useT();
  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>{t('legal.privacy.title')}</h1>
      </div>

      <div className="legal">
        <p className="legal-updated">{t('legal.privacy.lastUpdated')}</p>

        <p>
          {t('legal.privacy.introBefore')}
          <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a>
          {t('legal.privacy.introAfter')}
        </p>

        <h2>{t('legal.privacy.s1Heading')}</h2>
        <p>
          <strong>{t('legal.privacy.s1Para1Strong')}</strong>
          {t('legal.privacy.s1Para1Rest')}
        </p>
        <p>
          <strong>{t('legal.privacy.s1Para2Strong')}</strong>
          {t('legal.privacy.s1Para2Rest')}
        </p>
        <p>
          <strong>{t('legal.privacy.s1Para3Strong')}</strong>
          {t('legal.privacy.s1Para3Rest')}
        </p>
        <p>
          <strong>{t('legal.privacy.s1Para4Strong')}</strong>
          {t('legal.privacy.s1Para4Rest')}
        </p>

        <h2>{t('legal.privacy.s2Heading')}</h2>
        <ul>
          <li>{t('legal.privacy.s2Item1')}</li>
          <li>{t('legal.privacy.s2Item2')}</li>
          <li>{t('legal.privacy.s2Item3')}</li>
          <li>{t('legal.privacy.s2Item4')}</li>
        </ul>

        <h2>{t('legal.privacy.s3Heading')}</h2>
        <p>{t('legal.privacy.s3Intro')}</p>
        <ul>
          <li>
            <strong>{t('legal.privacy.s3Item1Strong')}</strong>
            {t('legal.privacy.s3Item1Rest')}
          </li>
          <li>
            <strong>{t('legal.privacy.s3Item2Strong')}</strong>
            {t('legal.privacy.s3Item2Rest')}
          </li>
          <li>
            <strong>{t('legal.privacy.s3Item3Strong')}</strong>
            {t('legal.privacy.s3Item3Rest')}
          </li>
          <li>
            <strong>{t('legal.privacy.s3Item4Strong')}</strong>
            {t('legal.privacy.s3Item4Rest')}
          </li>
        </ul>
        <p>{t('legal.privacy.s3Body1')}</p>
        <p>{t('legal.privacy.s3Body2')}</p>

        <h2>{t('legal.privacy.s4Heading')}</h2>
        <p>{t('legal.privacy.s4Body')}</p>

        <h2>{t('legal.privacy.s5Heading')}</h2>
        <p>
          {t('legal.privacy.s5BodyBefore')}
          <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a>
          {t('legal.privacy.s5BodyMiddle')}
          <a href="https://www.datatilsynet.dk" target="_blank" rel="noreferrer">
            {t('legal.privacy.s5DatatilsynetLink')}
          </a>
          {t('legal.privacy.s5BodyAfter')}
        </p>

        <h2>{t('legal.privacy.s6Heading')}</h2>
        <p>{t('legal.privacy.s6Body')}</p>

        <h2>{t('legal.privacy.s7Heading')}</h2>
        <p>{t('legal.privacy.s7Body')}</p>

        <h2>{t('legal.privacy.s8Heading')}</h2>
        <p>{t('legal.privacy.s8Body')}</p>
      </div>
    </main>
  );
}
