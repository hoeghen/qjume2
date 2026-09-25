import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { suggestAddresses } from '../lib/functions.js';

interface Suggestion {
  formatted: string;
  lat: number;
  lng: number;
}

// Below this, a query is too short to mean anything to a geocoder and would
// just spend API calls on every keystroke of the first word.
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

/**
 * A plain text address field with a typeahead dropdown of real candidate
 * addresses, backed by the `suggestAddresses` callable (CLAUDE.md: the
 * geocoding API key is a Cloud Functions secret, never exposed to the
 * browser, so this can't call a geocoder directly).
 *
 * Stays a normal named form field throughout - picking a suggestion just
 * fills the text, the same as typing it out by hand. `createQueue` /
 * `updateQueue` still geocode whatever ends up here at save time; this is
 * only about finding it, not skipping that step.
 */
export function AddressField({
  id,
  name,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const latestQuery = useRef('');

  useEffect(() => {
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      latestQuery.current = query;
      void suggestAddresses({ query })
        .then(({ suggestions: results }) => {
          // A slower request for an earlier keystroke landing after a
          // faster one for a later keystroke would otherwise flash stale
          // suggestions back onto the screen.
          if (latestQuery.current !== query) return;
          setSuggestions(results);
          setOpen(results.length > 0);
          setActiveIndex(-1);
        })
        .catch(() => {
          // A typeahead that fails is still a text field - say nothing and
          // let the owner keep typing.
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  function choose(suggestion: Suggestion) {
    setValue(suggestion.formatted);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        choose(suggestions[activeIndex]!);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="address-field">
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(suggestions.length > 0)}
        // A delay, not an immediate close: a click on an option fires this
        // blur first, and closing right away would take the list away
        // before the click could land on it.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-suggestions`}
      />
      {open && (
        <ul className="address-suggestions" id={`${id}-suggestions`} role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat},${s.lng}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? 'active' : ''}
              // onMouseDown, not onClick: it fires before the input's onBlur,
              // so the list is still open when the selection is read.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              {s.formatted}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
