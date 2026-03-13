"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
              Sign in to RoomEase
            </h1>
            <p className="text-lg leading-relaxed text-[var(--textSecondary)]">
              A campus-style booking experience for demos — with live availability simulation, conflict-aware booking, and admin approvals.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Live availability", "Conflict-aware booking", "Ratings & quality signals"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-sm text-[var(--textMuted)]">
              UW authentication only. Use your <span className="font-medium text-[var(--textSecondary)]">@uwaterloo.ca</span> account.
            </p>
          </div>

          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-[var(--shadowMd)]"
            style={{ borderRadius: "var(--radiusLg)" }}
          >
            <div className="mb-6">
              <p className="text-sm font-semibold text-[var(--text)]">Continue with</p>
              <p className="mt-1 text-sm text-[var(--textSecondary)]">University of Waterloo single sign-on</p>
            </div>
            <button
              type="button"
              onClick={() => signIn("azure-ad", { callbackUrl })}
              className="group flex w-full items-center justify-center gap-3 rounded-full border-0 bg-[var(--primary)] px-6 py-3 text-sm font-semibold transition-all duration-200 hover:bg-[var(--primaryHover)] hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] active:scale-[0.99]"
              style={{
                color: "var(--primaryText)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)",
              }}
            >
              <svg className="h-5 w-5 opacity-90" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 12.2l1.7 1.7L14.7 10.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign in with UW
            </button>
            <div className="mt-4 space-y-2 text-xs text-[var(--textMuted)]">
              <p>
                You’ll be redirected to UW single sign-on to authenticate, then returned to <span className="text-[var(--textSecondary)] font-medium">RoomEase</span>.
              </p>
              <p>
                Demo-safe: bookings and availability sync across tabs via local state.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" /></div>}>
      <SignInContent />
    </Suspense>
  );
}
