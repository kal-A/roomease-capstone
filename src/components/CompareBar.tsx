"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useCompare } from "@/lib/compareStore";

export function CompareBar() {
  const { compareIds, clearCompare } = useCompare();
  const pathname = usePathname();
  const showOnRoomsPage = pathname === "/rooms";
  const hideOnComparePage = pathname === "/compare";
  const show = compareIds.length >= 1 && showOnRoomsPage && !hideOnComparePage;
  const canCompare = compareIds.length >= 2;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: 8 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: 8 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden border-t border-[var(--border)] bg-[var(--surfaceElevated)] backdrop-blur-xl shadow-[var(--shadowXl)]"
        >
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4 sm:px-8">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">
                <span className="text-[var(--primary)] font-semibold">{compareIds.length}</span> room
                {compareIds.length !== 1 ? "s" : ""} selected
              </p>
              {compareIds.length === 1 && (
                <p className="text-xs text-[var(--textSecondary)] mt-0.5">Add another to compare</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearCompare}
                className="rounded-full border border-[var(--border)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
              >
                Clear
              </button>
              <Link
                href={canCompare ? "/compare" : "#"}
                aria-disabled={!canCompare}
                title={!canCompare ? "Add at least 2 rooms to compare" : undefined}
                className={`rounded-full px-6 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] ${
                  canCompare
                    ? "bg-[var(--primary)] text-black hover:bg-[var(--primaryHover)]"
                    : "bg-[var(--border)]/50 text-[var(--textMuted)] cursor-not-allowed pointer-events-none"
                }`}
                onClick={(e) => !canCompare && e.preventDefault()}
              >
                Compare
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
