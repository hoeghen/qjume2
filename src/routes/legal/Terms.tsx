import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

/**
 * A first draft, not a finished legal document — reviewed by no lawyer yet.
 * Written to match what the app actually does (CLAUDE.md, PRD) rather than
 * generic boilerplate, so the gap between what this says and what the app
 * does stays at zero as the app changes.
 *
 * The Danish translation is a first draft in the same sense as the English
 * text it mirrors — not lawyer-reviewed.
 */
export function Terms() {
  const { t } = useT();
  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>{t('legal.terms.title')}</h1>
      </div>

      <div className="legal">
        <p className="legal-updated">{t('legal.terms.lastUpdated')}</p>

        <p>{t('legal.terms.intro')}</p>

        <h2>{t('legal.terms.s1Heading')}</h2>
        <p>{t('legal.terms.s1Body')}</p>

        <h2>{t('legal.terms.s2Heading')}</h2>
        <p>{t('legal.terms.s2Body1')}</p>
        <p>
          {t('legal.terms.s2Body2Before')}
          <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a>
          {t('legal.terms.s2Body2After')}
        </p>

        <h2>{t('legal.terms.s3Heading')}</h2>
        <p>
          {t('legal.terms.s3Body1Before')}
          <strong>{t('legal.terms.s3Body1Strong')}</strong>
          {t('legal.terms.s3Body1After')}
        </p>
        <p>{t('legal.terms.s3Body2')}</p>

        <h2>{t('legal.terms.s4Heading')}</h2>
        <p>{t('legal.terms.s4Intro')}</p>
        <ul>
          <li>{t('legal.terms.s4Item1')}</li>
          <li>{t('legal.terms.s4Item2')}</li>
          <li>{t('legal.terms.s4Item3')}</li>
          <li>{t('legal.terms.s4Item4')}</li>
          <li>{t('legal.terms.s4Item5')}</li>
        </ul>
        <p>{t('legal.terms.s4Body')}</p>

        <h2>{t('legal.terms.s5Heading')}</h2>
        <p>
          {t('legal.terms.s5BodyBefore')}
          <LocalizedLink to="/privacy">{t('legal.terms.s5PrivacyLink')}</LocalizedLink>
          {t('legal.terms.s5BodyAfter')}
        </p>

        <h2>{t('legal.terms.s6Heading')}</h2>
        <p>{t('legal.terms.s6Body')}</p>

        <h2>{t('legal.terms.s7Heading')}</h2>
        <p>{t('legal.terms.s7Body')}</p>

        <h2>{t('legal.terms.s8Heading')}</h2>
        <p>{t('legal.terms.s8Body')}</p>

        <h2>{t('legal.terms.s9Heading')}</h2>
        <p>{t('legal.terms.s9Body')}</p>

        <h2>{t('legal.terms.s10Heading')}</h2>
        <p>
          {t('legal.terms.s10BodyBefore')}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
            {t('legal.terms.s10Link')}
          </a>
          {t('legal.terms.s10BodyAfter')}
        </p>

        <h2>{t('legal.terms.s11Heading')}</h2>
        <p>
          {t('legal.terms.s11BodyBefore')}
          <a href="mailto:bitwork@gmail.com">bitwork@gmail.com</a>
          {t('legal.terms.s11BodyAfter')}
        </p>
      </div>
    </main>
  );
}
