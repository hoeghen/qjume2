import { LocalizedLink } from '../lib/i18n/LocalizedLink.js';
import { useT } from '../lib/i18n/LanguageContext.js';
import { INDUSTRIES, industryPath, type Industry } from '../lib/industries.js';

/**
 * `/brancher`: every industry page, reached from "Brancher" in the ☰ menu.
 * The landing page deliberately carries no list of trades — the owner wants
 * it kept to the two audiences it is for.
 */
export function Industries() {
  const { t, locale } = useT();
  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>{t('industries.title')}</h1>
        <p className="screen-lede">{t('industries.lede')}</p>
      </div>

      <ul className="industry-grid">
        {INDUSTRIES.map((i) => (
          <li key={i.slug}>
            <LocalizedLink className="industry-tile" to={industryPath(i)}>
              <strong>{i.h1[locale]}</strong>
              <span>{i.description[locale]}</span>
            </LocalizedLink>
          </li>
        ))}
      </ul>

      <p className="legal">
        <LocalizedLink to="/koesystemer">{t('splash.compare')} →</LocalizedLink>
      </p>
    </main>
  );
}

/** One trade's page, `/koesystem-til-<slug>`. */
export function IndustryPage({ industry }: { industry: Industry }) {
  const { t, locale } = useT();
  const others = INDUSTRIES.filter((i) => i.slug !== industry.slug);

  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>{industry.h1[locale]}</h1>
      </div>

      <div className="legal guide">
        <p>{industry.intro[locale]}</p>

        <h2>{t('industries.whyTitle')}</h2>
        <ul className="guide-proscons">
          {industry.points.map((p) => (
            <li key={p.da} className="pro">
              {p[locale]}
            </li>
          ))}
        </ul>

        <h2>{t('industries.setupTitle')}</h2>
        <p>{industry.setup[locale]}</p>

        <h2>{t('splash.priceTitle')}</h2>
        <p>{t('splash.priceBody')}</p>
        <p>
          <LocalizedLink className="button" to="/shop?create=1">
            {t('splash.startFree')}
          </LocalizedLink>
        </p>

        <h2>{t('industries.otherTitle')}</h2>
        <p className="industry-others">
          {others.map((i, n) => (
            <span key={i.slug}>
              {n > 0 && ' · '}
              <LocalizedLink to={industryPath(i)}>{i.name[locale]}</LocalizedLink>
            </span>
          ))}
        </p>
        <p>
          <LocalizedLink to="/brancher">{t('industries.allIndustries')}</LocalizedLink>
          {' · '}
          <LocalizedLink to="/koesystemer">{t('splash.compare')}</LocalizedLink>
        </p>
      </div>
    </main>
  );
}
