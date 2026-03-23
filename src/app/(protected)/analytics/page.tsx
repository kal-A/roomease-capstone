"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/EmptyState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { useBookings } from "@/lib/bookingsStore";
import { getAppRoleFromEmail } from "@/lib/userRole";
import { getBuildingTicketLabel } from "@/lib/buildings";
import {
  getScopedBookings,
  getTopClubs,
  getTopRooms,
  getTopBuildings,
  getPeakHours,
  getTopTimeSlots,
  getTrendsByClub,
} from "@/lib/bookingAnalytics";

const GOLD = "var(--primary)";
const AXIS_STROKE = "var(--textMuted)";
const GRID_STROKE = "var(--border)";

function useCoreAnalytics(bookings: ReturnType<typeof useBookings>["bookings"]) {
  return useMemo(() => {
    const buildingCount: Record<string, number> = {};
    const roomCount: Record<string, { count: number; roomName: string; building: string }> = {};
    const capacityBuckets = { small: 0, medium: 0, large: 0 };

    for (const b of bookings) {
      buildingCount[b.building] = (buildingCount[b.building] ?? 0) + 1;
      if (!roomCount[b.roomId]) {
        roomCount[b.roomId] = { count: 0, roomName: b.roomName, building: b.building };
      }
      roomCount[b.roomId].count += 1;

      if (b.capacity <= 50) capacityBuckets.small += 1;
      else if (b.capacity <= 150) capacityBuckets.medium += 1;
      else capacityBuckets.large += 1;
    }

    const byBuildingList = Object.entries(buildingCount)
      .map(([code, count]) => ({ code, count, name: getBuildingTicketLabel(code) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byRoomList = Object.entries(roomCount)
      .map(([roomId, data]) => ({ roomId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const capacityData = [
      { name: "Small (0–50)", value: capacityBuckets.small, fill: "var(--primary)" },
      { name: "Medium (50–150)", value: capacityBuckets.medium, fill: "var(--primary)" },
      { name: "Large (150+)", value: capacityBuckets.large, fill: "var(--primary)" },
    ];

    return { byBuildingList, byRoomList, capacityData };
  }, [bookings]);
}

export default function AnalyticsPage() {
  const { bookings } = useBookings();
  const { data: session } = useSession();
  const email = session?.user?.email ?? null;
  const role = session?.user?.role ?? getAppRoleFromEmail(session?.user?.email);
  const scopedBookings = useMemo(() => {
    if (role === "member") {
      // `/api/bookings/mine` already scopes visible rows for members (own + club exec).
      return bookings;
    }
    return getScopedBookings(bookings, "user", email);
  }, [bookings, email, role]);

  const { byBuildingList, byRoomList, capacityData } = useCoreAnalytics(scopedBookings);
  const peakHoursData = useMemo(() => getPeakHours(scopedBookings), [scopedBookings]);
  const topClubs = useMemo(() => getTopClubs(scopedBookings, 8), [scopedBookings]);
  const myTopRooms = useMemo(() => getTopRooms(scopedBookings, 6), [scopedBookings]);
  const myTopBuildings = useMemo(() => getTopBuildings(scopedBookings, 6), [scopedBookings]);
  const topSlots = useMemo(() => getTopTimeSlots(scopedBookings, 5), [scopedBookings]);
  const trendsData = useMemo(() => getTrendsByClub(scopedBookings), [scopedBookings]);

  const hasData = scopedBookings.length > 0;
  const sections = useMemo(
    () =>
      [
        { id: "overview", label: "Overview" },
        { id: "clubs", label: "Clubs" },
        { id: "rooms", label: "Rooms" },
        { id: "buildings", label: "Buildings" },
        { id: "approval-funnel", label: "Approval Funnel" },
        { id: "trends", label: "Trends" },
        { id: "insights", label: "Insights" },
      ] as const,
    []
  );
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setScrollProgress(Math.max(0, Math.min(1, y / max)));
      const trigger = 320;
      setShowFloatingNav(y > trigger);
      lastScrollYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { threshold: [0.25, 0.45, 0.65] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="mx-auto w-full max-w-[1200px] overflow-x-hidden px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
            Booking Analytics
          </h1>
          <p className="mt-2 text-lg text-[var(--textSecondary)]">
            {role === "member"
              ? "Club-relevant booking activity you can see — rooms, buildings, and trends from your visibility."
              : role === "executive"
                ? "Operational view of your bookings this term across rooms, buildings, and time."
                : "Your own booking patterns across rooms, buildings, and organizers."}
          </p>
        </div>
      </div>
      {!hasData ? (
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-[var(--textMuted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="No analytics yet"
          description={
            role === "member"
              ? "Analytics appear when you have visible club bookings or recommendations in progress."
              : "Your analytics will appear once you have at least one booking."
          }
          suggestion={
            role === "member"
              ? "Explore rooms and send a recommendation to your executive."
              : "Book a room to see buildings, rooms, and organizer trends."
          }
          action={
            <Link
              href="/book"
              className="inline-flex rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 hover:bg-[var(--primaryHover)] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
              style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}
            >
              {role === "member" ? "Find a room" : "Book a Room"}
            </Link>
          }
        />
      ) : (
        <div
          id="overview"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 auto-rows-auto"
        >
          {/* Section 1 — Most Booked Buildings (bar chart) */}
          <motion.section
            id="buildings"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-lg"
          >
            <div className="mb-6 flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
                My Most Used Buildings
              </h2>
              {byBuildingList.length > 0 && (
                <span className="rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                  Most Popular
                </span>
              )}
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byBuildingList}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" stroke={AXIS_STROKE} tick={{ fill: "var(--textMuted)", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    stroke={AXIS_STROKE}
                    tick={{ fill: "var(--textSecondary)", fontSize: 11 }}
                    tickFormatter={(v) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surfaceElevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      backdropFilter: "blur(16px)",
                      color: "var(--text)",
                    }}
                    labelStyle={{ color: "var(--text)", fontWeight: 600 }}
                    itemStyle={{ color: "var(--text)" }}
                    formatter={(value) => [value ?? 0, "Bookings"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={600} animationBegin={0}>
                    {byBuildingList.map((_, i) => (
                      <Cell key={i} fill={GOLD} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Section 2 — Most Booked Rooms (ranked list) */}
          <motion.section
            id="rooms"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-lg"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">
              My Most Booked Rooms
            </h2>
            <ul className="space-y-3">
              {byRoomList.map(({ roomId, roomName, building, count }, i) => (
                <motion.li
                  key={roomId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition-all duration-200 hover:border-[var(--borderStrong)]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text)] truncate">{roomName}</p>
                    <p className="text-sm text-[var(--textSecondary)]">{getBuildingTicketLabel(building)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-[var(--textSecondary)]">
                      {count} booking{count !== 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/book?roomId=${encodeURIComponent(roomId)}`}
                      className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold transition-all duration-200 hover:bg-[var(--primaryHover)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                      style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}
                    >
                      {role === "member" ? "Recommend" : "Book this room"}
                    </Link>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          {/* Section 3 — Capacity Distribution */}
          <motion.section
            id="approval-funnel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-lg"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">Capacity Distribution</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={AXIS_STROKE}
                    tick={{ fill: "var(--textSecondary)", fontSize: 11 }}
                  />
                  <YAxis stroke={AXIS_STROKE} tick={{ fill: "var(--textMuted)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surfaceElevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text)",
                    }}
                    labelStyle={{ color: "var(--text)", fontWeight: 600 }}
                    itemStyle={{ color: "var(--text)" }}
                    formatter={(value) => [value ?? 0, "Bookings"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={600} animationBegin={100}>
                    {capacityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Section 4 — Peak booking hours */}
          <motion.section
            id="trends"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-lg"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">
              My Most Common Time Slots
            </h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke={AXIS_STROKE}
                    tick={{ fill: "var(--textSecondary)", fontSize: 10 }}
                  />
                  <YAxis stroke={AXIS_STROKE} tick={{ fill: "var(--textMuted)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surfaceElevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text)",
                    }}
                    formatter={(value) => [value ?? 0, "Bookings"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.hour ?? ""}
                  />
                  <Bar dataKey="bookings" radius={[4, 4, 0, 0]} animationDuration={600} animationBegin={150}>
                    {peakHoursData.map((_, i) => (
                      <Cell key={i} fill={GOLD} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Section 5 — Top organizers / clubs (user-focused) */}
          <motion.section
            id="clubs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-lg"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">
              My Most Used Organizer Names
            </h2>
            {topClubs.length === 0 ? (
              <p className="text-sm text-[var(--textSecondary)]">No organizer data yet.</p>
            ) : (
              <ul className="space-y-3">
                {topClubs.map((c, i) => (
                  <li
                    key={c.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                        {i + 1}
                      </span>
                      <p className="truncate text-sm font-medium text-[var(--text)]">{c.label}</p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--textSecondary)]">
                      {c.count} booking{c.count !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* Section 6 — Booking trends (user/global) */}
          <motion.section
            id="trends"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-lg md:col-span-2"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">
              My Booking Activity Over Time
            </h2>
            <div className="h-[260px]">
              {trendsData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-[var(--textSecondary)]">
                  No date data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="date"
                      stroke={AXIS_STROKE}
                      tick={{ fill: "var(--textMuted)", fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis stroke={AXIS_STROKE} tick={{ fill: "var(--textMuted)", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--surfaceElevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--text)",
                      }}
                      labelStyle={{ color: "var(--text)", fontWeight: 600 }}
                      itemStyle={{ color: "var(--text)" }}
                      labelFormatter={(v) => `Date: ${v}`}
                      formatter={(value) => [value ?? 0, "Bookings"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke={GOLD}
                      strokeWidth={2}
                      dot={{ fill: GOLD, r: 4 }}
                      activeDot={{ r: 6, fill: GOLD }}
                      animationDuration={600}
                      animationBegin={200}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.section>

          <motion.section
            id="insights"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-5 shadow-lg md:col-span-2"
          >
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--text)]">Insights</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Peak demand</p>
                <p className="mt-2 text-sm text-[var(--text)]">
                  {topSlots[0]?.label ? `Peak usage: ${topSlots[0].label}.` : "Insights will appear as bookings are created."}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Best rooms for you</p>
                <p className="mt-2 text-sm text-[var(--text)]">
                  {myTopRooms[0]?.label ? `${myTopRooms[0].label} is your strongest match.` : "No room usage signal yet."}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Demand forecast</p>
                <p className="mt-2 text-sm text-[var(--text)]">
                  {myTopBuildings[0]?.label
                    ? `High demand expected in ${getBuildingTicketLabel(myTopBuildings[0].label)} this week.`
                    : "No forecast signal yet."}
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      )}
      <AnimatePresence>
        {showFloatingNav && (
          <motion.nav
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-4 pointer-events-none"
            aria-label="Analytics section navigation"
          >
            <div className="pointer-events-auto relative overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surfaceElevated)]/92 px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-center gap-1">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                      activeSection === s.id
                        ? "bg-[var(--primary)] text-[var(--primaryText)]"
                        : "text-[var(--textSecondary)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 h-[2px] bg-[var(--primary)]/70 transition-[width] duration-150" style={{ width: `${scrollProgress * 100}%` }} />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

