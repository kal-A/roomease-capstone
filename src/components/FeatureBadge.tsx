"use client";

import { motion } from "framer-motion";

const baseClass =
  "inline-flex rounded-full border bg-[var(--gold-badge-bg)] px-2.5 py-1 text-xs font-medium transition-colors";
const borderClass = "border-[var(--gold-badge-border)]";
const textClass = "text-[var(--gold-badge-text)]";

interface FeatureBadgeProps {
  children: React.ReactNode;
  /** Enable hover glow animation */
  animated?: boolean;
}

export function FeatureBadge({ children, animated = true }: FeatureBadgeProps) {
  const className = `${baseClass} ${borderClass} ${textClass}`;
  if (animated) {
    return (
      <motion.span
        className={className}
        whileHover={{
          boxShadow: "0 0 12px var(--primaryGlow)",
          transition: { duration: 0.2 },
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>
    );
  }
  return <span className={className}>{children}</span>;
}
