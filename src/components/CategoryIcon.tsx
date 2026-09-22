import type { QueueCategory } from '../types/index.js';

/**
 * One line-drawn glyph per category, in the design's stroke style.
 *
 * Purely supporting: the shop name and category filter already say what a row
 * is, so these are hidden from screen readers rather than named twice.
 */
const PATHS: Record<QueueCategory, string> = {
  // A takeaway cup.
  'food-and-drink':
    'M4 9h14v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z M18 10h1a2 2 0 1 1 0 4h-1 M8 4v2M11 4v2M14 4v2',
  // A cross.
  'health-and-medical': 'M12 5v14M5 12h14',
  // A columned front — the town hall and the bank both live behind one of
  // these, and government and finance share a category now (CLAUDE.md 7).
  'government-and-finance':
    'M4 10h16L12 4 4 10Z M7 10v8M12 10v8M17 10v8 M4 19h16',
  // A carrier bag — the errand category: retail, personal care, automotive.
  'shopping-and-services':
    'M6 8h12l-1 12H7L6 8Z M9 8V6a3 3 0 0 1 6 0v2',
  // A ticket stub — transport, an outing, a class: something you go out for.
  'travel-and-leisure':
    'M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V8Z M12 8v10',
  // Three people.
  other: 'M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 19a6 6 0 0 1 12 0',
};

export function CategoryIcon({ category }: { category: QueueCategory }) {
  return (
    <span className="category-icon">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d={PATHS[category]} />
      </svg>
    </span>
  );
}
