import type { AppRole } from "@/lib/userRole";
import { roleDisplayLabel } from "@/lib/userRole";

export function RoleBadge({ role, compact }: { role: AppRole; compact?: boolean }) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";
  const styles: Record<AppRole, string> = {
    admin:
      "border-[var(--borderStrong)] bg-[var(--surface)] text-[var(--foreground-secondary)] [data-theme=light]:bg-stone-100 [data-theme=light]:text-stone-700",
    executive:
      "border-[var(--gold)]/35 bg-[var(--gold)]/12 text-[var(--foreground)] [data-theme=light]:text-stone-800",
    member:
      "border-[var(--borderStrong)] bg-[var(--surfaceElevated)] text-[var(--foreground-secondary)] [data-theme=light]:bg-white [data-theme=light]:text-stone-600",
  };
  return (
    <span className={`${base} ${styles[role]}`} title={roleDisplayLabel(role)}>
      {compact ? role.charAt(0).toUpperCase() : roleDisplayLabel(role)}
    </span>
  );
}
