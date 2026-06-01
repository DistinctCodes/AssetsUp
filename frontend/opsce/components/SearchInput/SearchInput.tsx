"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SearchInputProps {
  /** Debounced value callback — fires 300 ms after the user stops typing. */
  onChange: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  /** Accessible label for the search field (default: "Search") */
  label?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SearchInput({
  onChange,
  defaultValue = "",
  placeholder = "Search…",
  className,
  label = "Search",
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep internal state in sync when defaultValue changes (e.g. from URL params)
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, 300);
  };

  const handleClear = () => {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange("");
  };

  // Clean up on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className={`relative ${className ?? ""}`}>
      <label htmlFor="search-input" className="sr-only">
        {label}
      </label>

      {/* Search icon */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"
      >
        <SearchIcon className="h-4 w-4" />
      </span>

      <input
        id="search-input"
        type="search"
        role="searchbox"
        aria-label={label}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm
          shadow-sm outline-none transition
          placeholder:text-gray-400
          focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.65 16.65 7.5 7.5 0 0016.65 16.65z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}