import { Link, useNavigate, type LinkProps, type NavigateOptions } from 'react-router-dom';
import { useLocale } from './LanguageContext.js';
import { withLocale } from './locale.js';

/**
 * A `Link` that keeps whatever language the visitor is already reading in.
 *
 * Every route in the app is written once, unprefixed (e.g. `/shop/billing`);
 * this is the one place that adds the `/da` prefix back on when the current
 * page has it. Call sites never hardcode a locale - if they did, a Danish
 * visitor would be bounced back to English on the very next click.
 */
export function LocalizedLink({ to, ...props }: LinkProps) {
  const locale = useLocale();
  const target = typeof to === 'string' ? withLocale(to, locale) : to;
  return <Link to={target} {...props} />;
}

/** The `navigate()` equivalent of `LocalizedLink`. */
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const locale = useLocale();
  return (to: string, options?: NavigateOptions) =>
    navigate(withLocale(to, locale), options);
}
