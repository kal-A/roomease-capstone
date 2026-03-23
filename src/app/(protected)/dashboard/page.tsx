"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DateTime } from "luxon";
import { useBookings } from "@/lib/bookingsStore";
import { DEMO_CLUB_NAME, getAppRoleFromEmail } from "@/lib/userRole";
import { getTopRooms, getTopBuildings, getTrendsByClub } from "@/lib/bookingAnalytics";
import { RoleBadge } from "@/components/RoleBadge";
import { EmptyState } from "@/components/EmptyState";
type Membership = { club_name: string; role_in_club: string; joined_at?: string };

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { bookings } = useBookings();
  const role = session?.user?.role ?? getAppRoleFromEmail(session?.user?.email);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/club-memberships");
        const json = (await res.json().catch(() => ({}))) as { memberships?: Membership[] };
        if (!cancelled) setMemberships(Array.isArray(json.memberships) ? json.memberships : []);
      } catch {
        if (!cancelled) setMemberships([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = DateTime.now().setZone("America/Toronto").startOf("day");

  const futureBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status !== "confirmed" && b.status !== "approved" && b.status !== "pending" && b.status !== "changes_requested")
        return false;
      const d = b.preferredDate;
      if (!d) return false;
      const day = DateTime.fromISO(d, { zone: "America/Toronto" });
      return day.isValid && day >= today;
    });
  }, [bookings, today]);

  const pastForMetrics = useMemo(() => {
    return bookings.filter((b) => {
      const d = b.preferredDate;
      if (!d) return false;
      const day = DateTime.fromISO(d, { zone: "America/Toronto" });
      return day.isValid && day < today && (b.status === "confirmed" || b.status === "approved" || b.status === "denied");
    });
  }, [bookings, today]);

  const topRooms = useMemo(() => getTopRooms(pastForMetrics, 5), [pastForMetrics]);
  const topBuildings = useMemo(() => getTopBuildings(pastForMetrics, 5), [pastForMetrics]);
  const trends = useMemo(() => getTrendsByClub(pastForMetrics).slice(-6), [pastForMetrics]);

  const execClubs = memberships.filter((m) => String(m.role_in_club).toLowerCase() === "executive");

  const clubRoleLabel = (rc: string) =>
    String(rc).toLowerCase() === "executive" ? "Executive" : "Member";

  if (status === "loading") {
    return <div className="mx-auto max-w-[1000px] px-6 py-16 text-[var(--textSecondary)]">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text)]">Dashboard</h1>
            <RoleBadge role={role} />
          </div>
          <p className="mt-2 text-lg text-[var(--textSecondary)]">
            {role === "admin" && "Operational overview — use Admin Portal for approvals, blockers, and global analytics."}
            {role === "executive" && "Club operations, bookings this term, and incoming member recommendations."}
            {role === "member" && "Your clubs, upcoming visibility, and booking insights from what you can see."}
          </p>
        </div>
        {session?.user?.isAdmin && (
          <Link
            href="/admin"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:border-[var(--gold)]"
          >
            Admin Portal
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">Clubs</h2>
          {memberships.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--textSecondary)]">No clubs assigned yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {memberships.map((m) => (
                <li key={`${m.club_name}-${m.role_in_club}`} className="flex justify-between gap-2 text-sm">
                  <span className="text-[var(--text)] font-medium">{m.club_name}</span>
                  <span className="text-[var(--textSecondary)]">{clubRoleLabel(m.role_in_club)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">Upcoming & visible</h2>
          <p className="mt-3 text-3xl font-bold text-[var(--text)]">{futureBookings.length}</p>
          <p className="text-sm text-[var(--textSecondary)] mt-1">Active / upcoming reservations in your My Bookings scope</p>
          <Link href="/bookings" className="mt-4 inline-block text-sm font-semibold text-[var(--primary)]">
            Open My Bookings →
          </Link>
        </section>
      </div>

      {role === "executive" && (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">Club summary</h2>
              <p className="text-sm text-[var(--textSecondary)] mt-1">
                Demo snapshot for {execClubs[0]?.club_name ?? DEMO_CLUB_NAME}
              </p>
            </div>
            <Link
              href="/exec/requests"
              className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primaryText)]"
            >
              Member requests
            </Link>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-[var(--textMuted)]">Member count (demo)</dt>
              <dd className="text-[var(--text)] font-semibold text-xl mt-1">50</dd>
            </div>
            <div>
              <dt className="text-[var(--textMuted)]">Accessibility / furniture (demo)</dt>
              <dd className="text-[var(--textSecondary)] mt-1">Wheelchair + flexible seating most requested</dd>
            </div>
            <div>
              <dt className="text-[var(--textMuted)]">Room fit hint</dt>
              <dd className="text-[var(--text)] font-medium mt-1">Optimal room: DC 1350</dd>
            </div>
          </dl>
        </section>
      )}

      {role === "member" && (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Recommend a room</h2>
          <p className="text-sm text-[var(--textSecondary)] mb-4">
            You can explore availability and send a polished request to your executive — no direct booking required.
          </p>
          <Link href="/book" className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primaryText)] inline-block">
            Find a room
          </Link>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-[var(--text)] mb-4">
          {role === "member" ? "Insights (visible history)" : "Booking metrics (your scope)"}
        </h2>
        {pastForMetrics.length === 0 ? (
          <EmptyState
            title="No historical bookings yet"
            description="Metrics appear from past confirmed or completed activity in your current view."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-xs font-semibold uppercase text-[var(--textMuted)]">Rooms</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {topRooms.map((r) => (
                  <li key={r.key} className="flex justify-between gap-2">
                    <span className="truncate text-[var(--text)]">{r.label}</span>
                    <span className="text-[var(--textSecondary)]">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-xs font-semibold uppercase text-[var(--textMuted)]">Buildings</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {topBuildings.map((r) => (
                  <li key={r.key} className="flex justify-between gap-2">
                    <span className="truncate text-[var(--text)]">{r.label}</span>
                    <span className="text-[var(--textSecondary)]">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-xs font-semibold uppercase text-[var(--textMuted)]">Activity (by organizer tag)</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {trends.map((t) => (
                  <li key={t.date} className="flex justify-between gap-2">
                    <span className="text-[var(--text)]">{t.date}</span>
                    <span className="text-[var(--textSecondary)]">{t.bookings}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
