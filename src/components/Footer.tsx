export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] relative z-10">
      <div className="mx-auto max-w-[1200px] px-6 py-14 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-[var(--text)]">
            RoomEase - UW Capstone Project
          </p>
          <p className="text-sm text-[var(--textSecondary)]">Built by Team 13</p>
          <p className="text-sm text-[var(--textMuted)]">2026</p>
        </div>
      </div>
    </footer>
  );
}
