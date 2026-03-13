"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const currentPainPoints = [
  "Multiple booking portals across faculties",
  "Email-based requests and manual follow-up",
  "No unified view of availability",
  "Unclear approval workflows",
  "Scattered room catalogs and capacity info",
];

const roomEaseBenefits = [
  "Centralized room catalog with filters and search",
  "Real-time availability and conflict prevention",
  "Smart recommendations and match scores",
  "Structured approval workflow for admins",
  "Participant invites and booking history in one place",
];

export default function WhyRoomEasePage() {
  return (
    <div className="relative">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
            Current system vs RoomEase
          </h1>
          <p className="mt-4 text-xl text-[var(--textSecondary)]">
            Why a single platform improves campus room booking
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg"
            style={{ borderRadius: "var(--radiusLg)" }}
          >
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--text)]">
              Current system
            </h2>
            <ul className="space-y-3 text-[var(--textSecondary)]">
              {currentPainPoints.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--danger)]/60" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl border border-[var(--primary)]/40 bg-[var(--surface)] p-8 shadow-lg"
            style={{ borderRadius: "var(--radiusLg)", boxShadow: "0 0 0 1px var(--primary)/10" }}
          >
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--primary)]">
              RoomEase
            </h2>
            <ul className="space-y-3 text-[var(--textSecondary)]">
              {roomEaseBenefits.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]" aria-hidden>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/learn-more/about"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--primary)]/50 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            About RoomEase
          </Link>
        </div>
      </div>
    </div>
  );
}
