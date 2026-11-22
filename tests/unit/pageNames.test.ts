import { describe, expect, it } from 'vitest';
import { pageName } from '../../src/lib/pageNames.js';

describe('naming a page from its path', () => {
  it('matches every real route, unprefixed', () => {
    expect(pageName('/')).toBe('splash');
    expect(pageName('/find')).toBe('find');
    expect(pageName('/q/riverside-pharmacy/prescriptions')).toBe('queue-detail');
    expect(pageName('/s/riverside-pharmacy')).toBe('shop-queues');
    expect(pageName('/shop')).toBe('shop-index');
    expect(pageName('/shop/billing')).toBe('shop-billing');
    expect(pageName('/shop/settings')).toBe('shop-settings');
    expect(pageName('/shop/q/new')).toBe('queue-form-new');
    expect(pageName('/shop/q/prescriptions/settings')).toBe('queue-form-edit');
    expect(pageName('/shop/q/prescriptions/serve')).toBe('serving');
    expect(pageName('/monitor')).toBe('monitor');
    expect(pageName('/intro')).toBe('intro');
    expect(pageName('/koesystemer')).toBe('queue-systems');
    expect(pageName('/brancher')).toBe('industries');
    expect(pageName('/koesystem-til-apoteker')).toBe('industry-page');
    expect(pageName('/terms')).toBe('terms');
    expect(pageName('/privacy')).toBe('privacy');
    expect(pageName('/info')).toBe('info');
    expect(pageName('/admin')).toBe('admin-shop-list');
    expect(pageName('/admin/log')).toBe('admin-audit-log');
    expect(pageName('/admin/shops/riverside-pharmacy')).toBe('admin-shop-detail');
    expect(pageName('/admin/shops/riverside-pharmacy/q/prescriptions')).toBe(
      'admin-queue-edit',
    );
  });

  it('strips the /en and /da locale prefixes before matching', () => {
    expect(pageName('/en/find')).toBe('find');
    expect(pageName('/da/find')).toBe('find');
    expect(pageName('/en/q/riverside-pharmacy/prescriptions')).toBe(
      'queue-detail',
    );
    expect(pageName('/en')).toBe('splash');
    expect(pageName('/da')).toBe('splash');
  });

  it('falls back to the raw path for anything not listed', () => {
    expect(pageName('/something-new')).toBe('/something-new');
  });
});
