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
  // A columned front.
  'government-and-public-services':
    'M4 10h16L12 4 4 10Z M7 10v8M12 10v8M17 10v8 M4 19h16',
  // A coin.
  'banking-and-finance':
    'M12 4v16 M9.5 8.5c0-1 1-1.8 2.5-1.8s2.5.8 2.5 1.8-1 1.3-2.5 1.6-2.5.8-2.5 1.9 1 1.8 2.5 1.8 2.5-.8 2.5-1.8',
  // A carrier bag.
  'retail-and-shopping':
    'M6 8h12l-1 12H7L6 8Z M9 8V6a3 3 0 0 1 6 0v2',
  // Scissors.
  'personal-care':
    'M7 5l10 12 M17 5L7 17 M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  // A car.
  automotive:
    'M4 15h16 M5 15l1.5-5h11L19 15 M5 15v3M19 15v3 M8 12h8',
  // A mortarboard.
  education: 'M12 5 3 9l9 4 9-4-9-4Z M7 11v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4',
  // A ticket stub.
  'transport-and-travel':
    'M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V8Z M12 8v10',
  // A pin.
  'events-and-attractions':
    'M12 21s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
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
