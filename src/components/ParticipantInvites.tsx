"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Mock UW directory for demo; replace with real directory API later */
const MOCK_UW_EMAILS = [
  "farhan@uwaterloo.ca",
  "pranav@uwaterloo.ca",
  "alex@uwaterloo.ca",
  "sam@uwaterloo.ca",
  "jordan@uwaterloo.ca",
  "chen@uwaterloo.ca",
  "admin@uwaterloo.ca",
  "arts-space@uwaterloo.ca",
  "events@uwaterloo.ca",
];

function normalizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.endsWith("@uwaterloo.ca")) return trimmed;
  if (trimmed.includes("@")) return trimmed;
  return trimmed ? `${trimmed}@uwaterloo.ca` : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface ParticipantInvitesProps {
  value: string[];
  onChange: (emails: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function ParticipantInvites({
  value,
  onChange,
  label = "Invite participants (optional)",
  placeholder = "e.g. farhan@uwaterloo.ca",
  className = "",
}: ParticipantInvitesProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const emails = value ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = input.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const normalized = normalizeEmail(input);
    const filtered = MOCK_UW_EMAILS.filter(
      (e) =>
        e.toLowerCase().includes(q) ||
        e.toLowerCase().includes(normalized.replace("@uwaterloo.ca", ""))
    ).filter((e) => !emails.includes(e));
    setSuggestions(filtered.slice(0, 5));
    setOpen(filtered.length > 0);
  }, [input, emails]);

  const addEmail = (email: string) => {
    const norm = email.toLowerCase();
    if (!norm || emails.includes(norm)) return;
    onChange([...emails, norm]);
    setInput("");
    setSuggestions([]);
    setOpen(false);
  };

  const removeEmail = (email: string) => {
    onChange(emails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const norm = normalizeEmail(input);
      if (norm && isValidEmail(norm)) {
        addEmail(norm);
      } else if (suggestions[0]) {
        addEmail(suggestions[0]);
      }
    } else if (e.key === "Backspace" && !input && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      <label className="mb-2 block text-sm font-medium text-[var(--textSecondary)]">
        {label}
      </label>
      <div
        className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 transition-all duration-200 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--focusRing)]"
        onClick={() => (document as any).activeElement?.tagName === "INPUT" || setOpen(true)}
      >
        <AnimatePresence mode="popLayout">
          {emails.map((email) => (
            <motion.span
              key={email}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/15 px-3 py-1 text-sm text-[var(--primary)]"
            >
              {email}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(email);
                }}
                className="rounded-full p-0.5 hover:bg-[var(--primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                aria-label={`Remove ${email}`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input.trim() && setOpen(true)}
          placeholder={emails.length === 0 ? placeholder : ""}
          className="min-w-[12ch] flex-1 border-0 bg-transparent py-1 text-[var(--text)] placeholder-[var(--textMuted)] focus:outline-none focus:ring-0"
          aria-label="Add participant email"
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surfaceElevated)] py-1 shadow-[var(--shadowLg)]"
          role="listbox"
        >
          {suggestions.map((s) => (
            <li key={s} role="option">
              <button
                type="button"
                onClick={() => addEmail(s)}
                className="w-full px-4 py-2.5 text-left text-sm text-[var(--text)] hover:bg-[var(--primary)]/10"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-[var(--textMuted)]">
        Type to search UW directory. Press Enter or comma to add.
      </p>
    </div>
  );
}
