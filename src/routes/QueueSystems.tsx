import { LocalizedLink } from '../lib/i18n/LocalizedLink.js';
import { useT } from '../lib/i18n/LanguageContext.js';
import { PRICES_CHECKED, QUEUE_SYSTEMS_FAQ, SUPPLIERS } from '../lib/queueSystems.js';

/**
 * `/koesystemer`: a guide to the kinds of queue system on the Danish market,
 * with Qjume as one of them.
 *
 * Written to be honest rather than a sales page — it says when a hardware
 * system is the better fit — because that is what makes a comparison worth
 * ranking and quoting. Prices live in `src/lib/queueSystems.ts`, with the date
 * they were checked.
 */
export function QueueSystems() {
  const { t, locale } = useT();

  return (
    <main className="screen">
      <div className="screen-intro">
        <h1>{t('queueSystems.title')}</h1>
      </div>

      <div className="legal guide">
        <p>{t('queueSystems.lede')}</p>

        <Kind
          title={t('queueSystems.paperTitle')}
          body={t('queueSystems.paperBody')}
          pros={[t('queueSystems.paperPros')]}
          cons={[t('queueSystems.paperCons1'), t('queueSystems.paperCons2'), t('queueSystems.paperCons3')]}
        />
        <Kind
          title={t('queueSystems.electronicTitle')}
          body={t('queueSystems.electronicBody')}
          pros={[t('queueSystems.electronicPros')]}
          cons={[t('queueSystems.electronicCons1'), t('queueSystems.electronicCons2')]}
        />
        <Kind
          title={t('queueSystems.digitalTitle')}
          body={t('queueSystems.digitalBody')}
          pros={[t('queueSystems.digitalPros1'), t('queueSystems.digitalPros2'), t('queueSystems.digitalPros3')]}
          cons={[t('queueSystems.digitalCons1'), t('queueSystems.digitalCons2')]}
        />

        <h2>{t('queueSystems.pricesTitle')}</h2>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead>
              <tr>
                <th scope="col">{t('queueSystems.colSupplier')}</th>
                <th scope="col">{t('queueSystems.colType')}</th>
                <th scope="col">{t('queueSystems.colPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {SUPPLIERS.map((row) => (
                <tr key={row.name} className={row.ours ? 'ours' : undefined}>
                  <th scope="row">
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noopener noreferrer">
                        {row.name}
                      </a>
                    ) : (
                      row.name
                    )}
                  </th>
                  <td>{row.type[locale]}</td>
                  <td>{row.price[locale]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="guide-note">{t('queueSystems.pricesChecked', { date: PRICES_CHECKED[locale] })}</p>

        <h2>{t('queueSystems.whichTitle')}</h2>
        <ul>
          <li>{t('queueSystems.which1')}</li>
          <li>{t('queueSystems.which2')}</li>
          <li>{t('queueSystems.which3')}</li>
        </ul>

        <h2>{t('queueSystems.qjumeTitle')}</h2>
        <p>{t('queueSystems.qjumeBody')}</p>
        <p>
          <LocalizedLink className="button" to="/shop?create=1">
            {t('splash.startFree')}
          </LocalizedLink>
        </p>

        <h2>{t('queueSystems.faqTitle')}</h2>
        <dl className="guide-faq">
          {QUEUE_SYSTEMS_FAQ.map((n) => (
            <div key={n}>
              <dt>{t(`queueSystems.faq${n}Q`)}</dt>
              <dd>{t(`queueSystems.faq${n}A`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}

function Kind({ title, body, pros, cons }: { title: string; body: string; pros: string[]; cons: string[] }) {
  const { t } = useT();
  return (
    <section className="guide-kind">
      <h2>{title}</h2>
      <p>{body}</p>
      <ul className="guide-proscons">
        {pros.map((p) => (
          <li key={p} className="pro">
            <span className="sr-only">{t('queueSystems.pros')}: </span>
            {p}
          </li>
        ))}
        {cons.map((c) => (
          <li key={c} className="con">
            <span className="sr-only">{t('queueSystems.cons')}: </span>
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}
