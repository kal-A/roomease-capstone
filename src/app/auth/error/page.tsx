"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const isDomainError =
    error === "AccessDenied" || error === "Callback" || error === "CallbackRoute";

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadowMd)]"
        style={{ borderRadius: "var(--radiusLg)" }}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dangerBg)]">
            <svg
              className="h-6 w-6 text-[var(--danger)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            {isDomainError ? "University account required" : "Sign-in error"}
          </h1>
          <p className="mt-2 text-sm text-[var(--textSecondary)]">
            {isDomainError
              ? "Please sign in using your University of Waterloo account (@uwaterloo.ca)."
              : "Something went wrong. Please try again."}
          </p>
        </div>
        <Link
          href="/auth/signin"
          className="block w-full rounded-full border-0 bg-[var(--primary)] px-6 py-3 text-center text-sm font-semibold transition-all duration-200 hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
          style={{
            color: "var(--primaryText)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)",
          }}
        >
          Try again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" /></div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
