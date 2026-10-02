import { INTRO_VIDEO_URL, youTubeEmbed } from '../lib/intro.js';
import { LocalizedLink } from '../lib/i18n/LocalizedLink.js';
import { useT } from '../lib/i18n/LanguageContext.js';

/**
 * The introduction for a business deciding whether to use Qjume.
 *
 * Plays the video when there is one (`INTRO_VIDEO_URL`); until then, the same
 * story in three short steps, so choosing "see the introduction" is never a
 * dead end. Ends where it should: creating a shop.
 */
export function Intro() {
  const { t } = useT();
  const embed = INTRO_VIDEO_URL ? youTubeEmbed(INTRO_VIDEO_URL) : null;

  return (
    <main className="panel intro">
      <h1>{t('intro.title')}</h1>

      {INTRO_VIDEO_URL && embed && (
        <div className="intro-video">
          <iframe
            src={embed}
            title={t('intro.title')}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {INTRO_VIDEO_URL && !embed && (
        <video className="intro-video" src={INTRO_VIDEO_URL} controls playsInline />
      )}

      {!INTRO_VIDEO_URL && (
        <>
          <p className="muted">{t('intro.noVideoYet')}</p>
          <ol className="intro-steps">
            <li>
              <strong>{t('intro.step1Title')}</strong> {t('intro.step1')}
            </li>
            <li>
              <strong>{t('intro.step2Title')}</strong> {t('intro.step2')}
            </li>
            <li>
              <strong>{t('intro.step3Title')}</strong> {t('intro.step3')}
            </li>
          </ol>
        </>
      )}

      <p className="intro-price">{t('intro.price')}</p>
      <LocalizedLink className="button" to="/shop?create=1">
        {t('intro.create')}
      </LocalizedLink>
    </main>
  );
}
