"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminApprovalsPage from "./approvals/page";
import AdminAnalyticsPage from "./analytics/page";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.isAdmin ?? false;
  const [tab, setTab] = useState<"approvals" | "analytics">("approvals");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isAdmin) {
      router.replace("/");
    }
  }, [status, session, isAdmin, router]);

  if (status === "loading") {
    return <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10" />;
  }
  if (!session || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-8 sm:py-14 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
            Admin Portal
          </h1>
          <p className="mt-2 text-lg text-[var(--textSecondary)]">
            Approvals and operational analytics.
          </p>
        </div>

        <div className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-1 py-1 text-sm font-medium text-[var(--textSecondary)] shadow-sm">
          <button
            type="button"
            onClick={() => setTab("approvals")}
            className={`px-4 py-2 rounded-full transition-all ${
              tab === "approvals" ? "bg-[var(--primary)] text-[var(--primaryText)] shadow-sm" : "text-[var(--textSecondary)]"
            }`}
          >
            Approvals
          </button>
          <button
            type="button"
            onClick={() => setTab("analytics")}
            className={`px-4 py-2 rounded-full transition-all ${
              tab === "analytics" ? "bg-[var(--primary)] text-[var(--primaryText)] shadow-sm" : "text-[var(--textSecondary)]"
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "approvals" ? (
          <motion.div
            key="approvals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <AdminApprovalsPage />
          </motion.div>
        ) : (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <AdminAnalyticsPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

