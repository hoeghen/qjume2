import { Logo } from '../components/Logo.js';
import { LocalizedLink } from '../lib/i18n/LocalizedLink.js';
import { useT } from '../lib/i18n/LanguageContext.js';
import { YourQueues } from './customer/components/YourQueues.js';
import { ContinueFromSafari } from './customer/components/ContinueFromSafari.js';

/**
 * The front door, built to the design canvas.
 *
 * Two audiences arrive at the same URL and want opposite things, so the page
 * has to answer "what is this" and "which of you are you" in one glance.
 * Joining is the common case and gets the button; running a shop is a decision
 * someone makes once, so it gets a line of text.
 */
export function Splash() {
  const { t } = useT();

  return (
    <section className="splash">
      <YourQueues />
      <ContinueFromSafari />

      <Logo size={44} />

      <p className="splash-wordmark" aria-hidden="true">
        QjuMe
      </p>

      <h1 className="splash-title">{t('splash.title')}</h1>

      <p className="splash-lede">{t('splash.lede')}</p>

      <QueueIllustration />

      <div className="splash-actions">
        <LocalizedLink className="button splash-primary" to="/find">
          {t('splash.join')}
        </LocalizedLink>
        <LocalizedLink className="splash-secondary" to="/shop">
          {t('splash.createLink')}
        </LocalizedLink>
      </div>

      <BusinessSection />
    </section>
  );
}

/**
 * What a business searching for a queue system came for, below the fold so a
 * customer arriving to join a queue never has to read past it. Its headings
 * carry the words people search with ("køsystem", "kønummersystem",
 * "køstyring"), and every claim here is something the app actually does.
 */
function BusinessSection() {
  const { t } = useT();
  return (
    <section className="splash-business" aria-labelledby="splash-business-title">
      <p className="eyebrow">{t('splash.businessEyebrow')}</p>
      <h2 id="splash-business-title">{t('splash.businessTitle')}</h2>
      <p className="splash-business-lede">{t('splash.businessBody')}</p>

      <div className="splash-business-cards">
        <div className="splash-business-card">
          <h2>{t('splash.noHardwareTitle')}</h2>
          <p>{t('splash.noHardwareBody')}</p>
        </div>
        <div className="splash-business-card">
          <h2>{t('splash.featuresTitle')}</h2>
          <ul className="splash-checks">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <li key={n}>{t(`splash.feature${n}`)}</li>
            ))}
          </ul>
        </div>
        <div className="splash-business-card">
          <h2>{t('splash.priceTitle')}</h2>
          <p>{t('splash.priceBody')}</p>
          <div className="splash-business-actions">
            <LocalizedLink className="button" to="/shop?create=1">
              {t('splash.startFree')}
            </LocalizedLink>
            <LocalizedLink to="/koesystemer">{t('splash.compare')} →</LocalizedLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Four people on a dashed line, the one at the front picked out in orange.
 *
 * Decorative: it restates the lede rather than adding to it, so it is hidden
 * from screen readers instead of being given a description they would have to
 * listen through.
 */
function QueueIllustration() {
  return (
    <svg
      className="splash-queue"
      width="420"
      height="130"
      viewBox="0 0 420 130"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="10"
        y1="112"
        x2="410"
        y2="112"
        stroke="oklch(0.3 0.02 255)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <g stroke="oklch(0.55 0.02 255)" strokeWidth="2" fill="none">
        {[60, 140, 220].map((x) => (
          <g key={x}>
            <circle cx={x} cy="40" r="13" />
            <path d={`M${x - 20} 100 v-20 a20 20 0 0 1 40 0 v20`} />
          </g>
        ))}
      </g>
      {/* Next to be called. */}
      <g stroke="oklch(0.62 0.19 38)" strokeWidth="2.5" fill="none">
        <circle cx="300" cy="38" r="14" />
        <path d="M278 100 v-21 a22 22 0 0 1 44 0 v21" />
      </g>
    </svg>
  );
}
