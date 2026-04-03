"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
}

export default function SearchInput({ value, onChange }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent),
    []
  );
  const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";
  const showBadge = !focused && !value;

  return (
    <div className="relative mb-4">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search..."
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-16 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {showBadge && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden rounded border border-gray-600 bg-gray-700 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-400 sm:inline-block">
          {shortcutLabel}
        </kbd>
      )}
    </div>
  );
}
