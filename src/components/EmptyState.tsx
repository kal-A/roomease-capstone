"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  suggestion?: string;
  action?: ReactNode;
  className?: string;
}

const defaultIcon = (
  <svg className="h-12 w-12 text-[var(--textMuted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.5M4 13h2.5m12 0h-2.5m0 0V6a2 2 0 012-2h2.5M4 13V6a2 2 0 012-2h2.5" />
  </svg>
);

export function EmptyState({
  icon = defaultIcon,
  title,
  description,
  suggestion,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] py-16 px-8 text-center ${className}`}
      style={{ borderRadius: "var(--radiusLg)" }}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surfaceElevated)] border border-[var(--border)] text-[var(--icon)] mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--text)] tracking-tight">
        {title}
      </h3>
      <p className="mt-2 max-w-sm mx-auto text-sm text-[var(--textSecondary)] leading-relaxed">
        {description}
      </p>
      {suggestion && (
        <p className="mt-3 text-xs text-[var(--textMuted)] max-w-xs mx-auto">
          {suggestion}
        </p>
      )}
      {action && (
        <div className="mt-6 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
