"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DirectoryUser = { name: string; email: string };

/** Mock UW directory for demo; replace with real directory API later */
const MOCK_UW_DIRECTORY: DirectoryUser[] = [
  { name: "Farhan Valli", email: "farhan@uwaterloo.ca" },
  { name: "Pranav Gupta", email: "pranav@uwaterloo.ca" },
  { name: "Alex Chen", email: "alex@uwaterloo.ca" },
  { name: "Sam Jordan", email: "sam@uwaterloo.ca" },
  { name: "Jordan Lee", email: "jordan@uwaterloo.ca" },
  { name: "Chen Wang", email: "chen@uwaterloo.ca" },
  { name: "Admin", email: "admin@uwaterloo.ca" },
  { name: "Arts Space Team", email: "arts-space@uwaterloo.ca" },
  { name: "Events Office", email: "events@uwaterloo.ca" },
];

const RECENTS_KEY = "roomease.recentInvites.v1";
const MAX_RECENTS = 5;
const MAX_PARTICIPANTS = 10;

function normalizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.endsWith("@uwaterloo.ca")) return trimmed;
  if (trimmed.includes("@")) return trimmed;
  return trimmed ? `${trimmed}@uwaterloo.ca` : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUwEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@uwaterloo.ca");
}

function getFirstLastInitials(nameOrEmail: string): string {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "?";
  if (s.includes("@")) return s.slice(0, 1).toUpperCase();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  const first = parts[0].slice(0, 1).toUpperCase();
  const last = parts[parts.length - 1].slice(0, 1).toUpperCase();
  return `${first}${last}`;
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
  placeholder = "Search by name or @uwaterloo.ca email",
  className = "",
}: ParticipantInvitesProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [recent, setRecent] = useState<DirectoryUser[]>([]);
  const [query, setQuery] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const emails = value ?? [];

  useEffect(() => {
    const stored = safeParseJson<DirectoryUser[]>(typeof window !== "undefined" ? window.localStorage.getItem(RECENTS_KEY) : null, []);
    const cleaned = Array.isArray(stored)
      ? stored
          .filter((u) => u && typeof u.email === "string" && typeof u.name === "string")
          .map((u) => ({ name: u.name.trim() || u.email, email: u.email.trim().toLowerCase() }))
          .filter((u) => isValidEmail(u.email))
          .slice(0, MAX_RECENTS)
      : [];
    setRecent(cleaned);
  }, []);

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
    // Debounce search for smoother feel.
    const t = window.setTimeout(() => setQuery(input.trim()), 130);
    return () => window.clearTimeout(t);
  }, [input]);

  const directorySuggestions = useMemo(() => {
    const q = query.toLowerCase();
    const normalizedEmail = normalizeEmail(query);

    const exclude = new Set(emails.map((e) => e.toLowerCase()));
    const all = MOCK_UW_DIRECTORY.filter((u) => !exclude.has(u.email.toLowerCase()));

    if (!q) return all.slice(0, 8);

    const starts: DirectoryUser[] = [];
    const contains: DirectoryUser[] = [];
    const exact: DirectoryUser[] = [];

    for (const u of all) {
      const name = u.name.toLowerCase();
      const email = u.email.toLowerCase();
      const matches = name.includes(q) || email.includes(q) || (normalizedEmail && email.includes(normalizedEmail.replace("@uwaterloo.ca", "")));
      if (!matches) continue;
      if (normalizedEmail && email === normalizedEmail.toLowerCase()) {
        exact.push(u);
      } else if (name.startsWith(q) || email.startsWith(q)) {
        starts.push(u);
      } else {
        contains.push(u);
      }
    }

    const combined = [...exact, ...starts, ...contains];
    const seen = new Set<string>();
    const unique: DirectoryUser[] = [];
    for (const u of combined) {
      const key = u.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(u);
    }
    return unique.slice(0, 8);
  }, [query, emails]);

  const recentSuggestions = useMemo(() => {
    const exclude = new Set(emails.map((e) => e.toLowerCase()));
    const cleaned = recent.filter((u) => !exclude.has(u.email.toLowerCase()));
    if (!query.trim()) return cleaned.slice(0, MAX_RECENTS);

    const q = query.toLowerCase();
    const out = cleaned.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    return out.slice(0, MAX_RECENTS);
  }, [recent, emails, query]);

  const allVisibleSuggestions = useMemo(() => {
    // Two sections in dropdown, but we need a single index space for keyboard nav.
    return [...recentSuggestions, ...directorySuggestions];
  }, [recentSuggestions, directorySuggestions]);

  const persistRecent = (u: DirectoryUser) => {
    const next = [{ name: u.name.trim() || u.email, email: u.email.toLowerCase() }, ...recent]
      .filter((x, idx, arr) => arr.findIndex((a) => a.email.toLowerCase() === x.email.toLowerCase()) === idx)
      .slice(0, MAX_RECENTS);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addParticipant = (u: DirectoryUser) => {
    if (emails.length >= MAX_PARTICIPANTS) {
      setInlineError(`Max ${MAX_PARTICIPANTS} participants`);
      return;
    }
    const norm = u.email.toLowerCase();
    if (!norm || emails.includes(norm)) {
      setInlineError("Already added");
      return;
    }
    if (!isValidEmail(norm)) {
      setInlineError("Invalid email format");
      return;
    }
    if (!isUwEmail(norm)) {
      setInlineError("Only @uwaterloo.ca users are supported");
      return;
    }
    onChange([...emails, norm]);
    persistRecent(u);
    setInput("");
    setQuery("");
    setHighlighted(0);
    setOpen(false);
    setInlineError(null);
  };

  const removeEmail = (email: string) => {
    onChange(emails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(allVisibleSuggestions.length - 1, h + 1));
      setInlineError(null);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
      setInlineError(null);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setInlineError(null);
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const normalized = normalizeEmail(input);
      if (normalized && isValidEmail(normalized)) {
        addParticipant({ name: normalized, email: normalized });
        return;
      }
      const picked = allVisibleSuggestions[highlighted] ?? allVisibleSuggestions[0];
      if (picked) addParticipant(picked);
    } else if (e.key === "Backspace" && !input && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  const highlightText = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <span className="text-[var(--primary)] font-medium">{match}</span>
        {after}
      </>
    );
  };

  const focusInput = () => {
    inputRef.current?.focus();
    setOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      <label className="mb-2 block text-sm font-medium text-[var(--textSecondary)]">
        {label}
      </label>
      <div
        className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 transition-all duration-200 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--focusRing)]"
        onClick={focusInput}
      >
        <AnimatePresence mode="popLayout">
          {emails.map((email) => (
            <motion.span
              key={email}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/15 px-3 py-1 text-sm text-[var(--primary)]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[11px] font-semibold text-[var(--primary)] transition-transform duration-200 group-hover:scale-[1.03]">
                {getFirstLastInitials(
                  MOCK_UW_DIRECTORY.find((u) => u.email.toLowerCase() === email.toLowerCase())?.name ?? email
                )}
              </span>
              <span className="max-w-[220px] truncate">
                {MOCK_UW_DIRECTORY.find((u) => u.email.toLowerCase() === email.toLowerCase())?.name ?? email}
              </span>
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
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setOpen(true);
            setInlineError(null);
            setHighlighted(0);
          }}
          onBlur={() => {
            // small delay so clicking a suggestion still works
            if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = window.setTimeout(() => setOpen(false), 120);
          }}
          placeholder={emails.length === 0 ? placeholder : ""}
          className="min-w-[12ch] flex-1 border-0 bg-transparent py-1 text-[var(--text)] placeholder-[var(--textMuted)] focus:outline-none focus:ring-0"
          aria-label="Add participant email"
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowLg)] backdrop-blur-md"
            role="listbox"
          >
            <div className="max-h-64 overflow-auto py-1">
              {recentSuggestions.length > 0 && (
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--textMuted)]">Recently invited</p>
                </div>
              )}
              {recentSuggestions.map((u, idx) => {
                const rowIndex = idx;
                const isActive = highlighted === rowIndex;
                return (
                  <button
                    key={`recent-${u.email}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addParticipant(u)}
                    onMouseEnter={() => setHighlighted(rowIndex)}
                    className={`w-full px-3 py-2.5 text-left transition-colors ${
                      isActive ? "bg-[var(--primary)]/10" : "hover:bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-xs font-semibold text-[var(--textSecondary)]">
                        {getFirstLastInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text)]">{highlightText(u.name) as any}</p>
                        <p className="truncate text-xs text-[var(--textMuted)]">{highlightText(u.email) as any}</p>
                      </div>
                    </div>
                  </button>
                );
              })}

              <div className="my-1 border-t border-[var(--border)]" />
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--textMuted)]">All users</p>
              </div>

              {directorySuggestions.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-[var(--textSecondary)]">No matching users</p>
                  <p className="mt-1 text-xs text-[var(--textMuted)]">Press Enter to add manually</p>
                </div>
              ) : (
                directorySuggestions.map((u, idx) => {
                  const rowIndex = recentSuggestions.length + idx;
                  const isActive = highlighted === rowIndex;
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addParticipant(u)}
                      onMouseEnter={() => setHighlighted(rowIndex)}
                      className={`w-full px-3 py-2.5 text-left transition-colors ${
                        isActive ? "bg-[var(--primary)]/10" : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-xs font-semibold text-[var(--textSecondary)]">
                          {getFirstLastInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text)]">{highlightText(u.name) as any}</p>
                          <p className="truncate text-xs text-[var(--textMuted)]">{highlightText(u.email) as any}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--textMuted)]">
            Start typing to find people. Press Enter to add.
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--textMuted)]">
            Only @uwaterloo.ca users are supported
          </p>
        </div>
        {inlineError && (
          <p className="text-xs font-medium text-[var(--danger)]">{inlineError}</p>
        )}
      </div>
    </div>
  );
}
