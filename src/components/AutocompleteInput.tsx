"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Full list of options to suggest from. */
  options: string[];
  /** Maximum number of visible suggestions. Defaults to 8. */
  maxSuggestions?: number;
  /** Class applied to the underlying input (used to preserve existing styling). */
  inputClassName?: string;
  /** Optional helper text shown beneath the input. */
  helperText?: string;
  /** When true, show a subtle "recognized" hint if the value exactly matches an option. */
  showExactMatchHint?: boolean;
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  options,
  maxSuggestions = 8,
  inputClassName,
  helperText,
  showExactMatchHint = false,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const trimmedValue = value.trim();

  const suggestions = useMemo(() => {
    if (!trimmedValue) return [];

    const query = trimmedValue.toLowerCase();
    const prefixMatches: string[] = [];
    const containsMatches: string[] = [];

    for (const option of options) {
      const lower = option.toLowerCase();
      if (lower.startsWith(query)) {
        prefixMatches.push(option);
      } else if (lower.includes(query)) {
        containsMatches.push(option);
      }
    }

    const ordered = [...prefixMatches, ...containsMatches];
    // Remove duplicates while preserving order
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const name of ordered) {
      if (!seen.has(name)) {
        seen.add(name);
        unique.push(name);
      }
    }

    return unique.slice(0, maxSuggestions);
  }, [options, trimmedValue, maxSuggestions]);

  const hasExactMatch = useMemo(() => {
    if (!trimmedValue) return false;
    return options.some((opt) => opt.toLowerCase() === trimmedValue.toLowerCase());
  }, [options, trimmedValue]);

  const openIfHasSuggestions = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[highlightedIndex];
        onChange(selected);
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleBlur = () => {
    // Small delay so clicks on suggestions still register
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 120);
  };

  const handleFocus = () => {
    openIfHasSuggestions();
  };

  const handleSuggestionClick = (name: string) => {
    onChange(name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const renderHighlightedText = (option: string) => {
    if (!trimmedValue) return option;

    const lowerOption = option.toLowerCase();
    const lowerQuery = trimmedValue.toLowerCase();
    const index = lowerOption.indexOf(lowerQuery);

    if (index === -1) {
      return option;
    }

    const before = option.slice(0, index);
    const match = option.slice(index, index + trimmedValue.length);
    const after = option.slice(index + trimmedValue.length);

    return (
      <>
        {before}
        <span className="text-[var(--primary)] font-medium">{match}</span>
        {after}
      </>
    );
  };

  const showSuggestions = isOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onInput={openIfHasSuggestions}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />

      {showSuggestions && (
        <div
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg backdrop-blur-md"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((name, index) => {
              const isActive = index === highlightedIndex;
              return (
                <li
                  key={name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionClick(name)}
                  className={[
                    "cursor-pointer px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-[var(--primary)]/10 text-[var(--text)]"
                      : "text-[var(--text)] hover:bg-[var(--surfaceHighlight)]",
                  ].join(" ")}
                >
                  {renderHighlightedText(name)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        {helperText && (
          <p className="text-xs text-[var(--textMuted)]">{helperText}</p>
        )}
        {showExactMatchHint && hasExactMatch && (
          <p className="text-xs text-[var(--primary)] font-medium">
            Recognized UW club
          </p>
        )}
      </div>
    </div>
  );
}

