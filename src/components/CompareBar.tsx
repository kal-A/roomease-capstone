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
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden border-t border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.85)] backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
        >
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4 sm:px-8">
            <div>
              <p className="text-sm font-medium text-[rgba(255,255,255,0.92)]">
                <span className="text-[#FFD54A]">{compareIds.length}</span> room
                {compareIds.length !== 1 ? "s" : ""} selected
              </p>
              {compareIds.length === 1 && (
                <p className="text-xs text-[rgba(255,255,255,0.65)] mt-0.5">Add another to compare</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearCompare}
                className="rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.65)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/50"
              >
                Clear
              </button>
              <Link
                href={canCompare ? "/compare" : "#"}
                aria-disabled={!canCompare}
                title={!canCompare ? "Add at least 2 rooms to compare" : undefined}
                className={`rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFD54A]/50 ${
                  canCompare
                    ? "bg-[#FFD54A] text-black hover:bg-[#F6C445] hover:shadow-[#FFD54A]/25"
                    : "bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.48)] cursor-not-allowed pointer-events-none"
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
