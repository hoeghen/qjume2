import type { QueueCategory } from '../types/index.js';

/**
 * The one copy of this record.
 *
 * It used to live twice — once for the discovery filter, once for the shop's
 * queue form — and the two had already drifted once by the time this was
 * noticed. A category renders the same word wherever it appears, so there is
 * one map, imported by both.
 */
export const CATEGORY_LABELS: Record<QueueCategory, string> = {
  'food-and-drink': 'Food and drink',
  'health-and-medical': 'Health and medical',
  'government-and-finance': 'Government and finance',
  'shopping-and-services': 'Shopping and services',
  'travel-and-leisure': 'Travel and leisure',
  other: 'Other',
};
