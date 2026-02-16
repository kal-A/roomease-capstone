"use client";

export function RoomCardSkeleton() {
  return (
    <div
      className="relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 min-h-[20rem] overflow-hidden"
      style={{ borderRadius: "var(--radiusLg)" }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute top-4 right-4 h-9 w-9 rounded-full bg-[var(--border)]/60" />
      <div className="pr-12">
        <div className="h-5 w-3/4 rounded-lg bg-[var(--border)]/60" />
        <div className="mt-3 h-6 w-24 rounded-xl bg-[var(--border)]/50" />
      </div>
      <div className="mt-4 flex justify-end gap-1">
        <div className="h-7 w-10 rounded bg-[var(--border)]/50" />
        <div className="h-4 w-14 self-end rounded bg-[var(--border)]/40" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-20 rounded-lg bg-[var(--border)]/40" />
          ))}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="h-10 w-full rounded-full bg-[var(--border)]/50" />
      </div>
    </div>
  );
}
