import { createContext, useContext, type ReactNode } from 'react';
import { en } from './en.js';
import { da } from './da.js';
import { DEFAULT_LOCALE, type Locale } from './locale.js';

const DICTIONARIES: Record<Locale, unknown> = { en, da };

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

function getPath(source: unknown, path: string[]): unknown {
  let node = source;
  for (const key of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** The shape of `t`, for lib functions (like `format.ts`) that need to translate outside a component. */
export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Builds a `t` for a given locale without needing a component or context —
 * `useT` below is a thin wrapper of this over the current locale, and tests
 * for locale-aware lib functions (`formatWait`, etc.) call this directly
 * rather than needing to render inside a `LanguageProvider`.
 */
export function createT(locale: Locale): TFunction {
  return (key, vars) => {
    const path = key.split('.');
    const localized = getPath(DICTIONARIES[locale], path);
    const fallback = getPath(en, path);
    const template = typeof localized === 'string' ? localized : fallback;
    if (typeof template !== 'string') {
      // A missing English key is a bug in the call site, not something to
      // hide in production - surfacing the key itself makes it obvious.
      return key;
    }
    return vars ? interpolate(template, vars) : template;
  };
}

/**
 * `t('discovery.title')` looks up a dot-separated key, Danish first, falling
 * back to English wherever a key hasn't been translated yet - so a page can
 * be translated incrementally without ever showing a blank or a raw key.
 *
 * `tn(count, 'discovery.queueCount')` does the same for a `{ one, other }`
 * pair, choosing by count and interpolating `{count}` automatically. English
 * and Danish both only ever need those two plural forms.
 */
export function useT() {
  const locale = useLocale();
  const t = createT(locale);

  function tn(
    count: number,
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    const form = count === 1 ? 'one' : 'other';
    return t(`${key}.${form}`, { count, ...vars });
  }

  return { t, tn, locale };
}
