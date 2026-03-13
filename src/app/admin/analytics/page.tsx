"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
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
import { EmptyState } from "@/components/EmptyState";
import { useBookings } from "@/lib/bookingsStore";
import { getBuildingTicketLabel } from "@/lib/buildings";
import {
  getTopClubs,
  getTopRooms,
  getTopClubsPerRoom,
  getBuildingsByClub,
  getTrendsByClub,
} from "@/lib/bookingAnalytics";

const GOLD = "var(--primary)";
const AXIS_STROKE = "var(--textMuted)";
const GRID_STROKE = "var(--border)";

export default function AdminAnalyticsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;
  const { bookings } = useBookings();

  const topClubs = useMemo(() => getTopClubs(bookings, 12), [bookings]);
  const topRooms = useMemo(() => getTopRooms(bookings, 10), [bookings]);
  const perRoomClubs = useMemo(() => getTopClubsPerRoom(bookings, 3), [bookings]);

  const [selectedClubKey, setSelectedClubKey] = useState<string>(() =>
    topClubs.length > 0 ? topClubs[0].key : ""
  );

  const buildingByClub = useMemo(
    () => (selectedClubKey ? getBuildingsByClub(bookings, selectedClubKey) : []),
    [bookings, selectedClubKey]
  );
  const clubTrends = useMemo(
    () => (selectedClubKey ? getTrendsByClub(bookings, selectedClubKey) : []),
    [bookings, selectedClubKey]
  );

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-[960px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-[var(--textMuted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 4.34L9.22 3.22A8.96 8.96 0 0112 3c4.97 0 9 4.03 9 9 0 1.16-.22 2.27-.63 3.29m-2.11 3.3A8.96 8.96 0 0112 21c-4.97 0-9-4.03-9-9 0-1.73.49-3.35 1.34-4.72M4 4l16 16" />
            </svg>
          }
          title="Admin analytics only"
          description="Club-level insights are only available to admin users."
          suggestion="Sign in with an admin account to view global analytics."
        />
      </div>
    );
  }

  const hasData = bookings.length > 0;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
          Admin Club Insights
        </h1>
        <p className="mt-2 text-lg text-[var(--textSecondary)]">
          Global booking analytics across all clubs, rooms, and buildings.
        </p>
      </div>

      {!hasData ? (
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-[var(--textMuted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="No booking data yet"
          description="Once there are bookings in the system, club analytics will appear here."
          suggestion="Use the demo booking flow to seed data."
        />
      ) : (
        <div
          className="grid gap-8 grid-cols-1 md:grid-cols-2 auto-rows-fr"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}
        >
          {/* A) Top clubs by bookings */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">
              Top Clubs by Bookings
            </h2>
            <ul className="space-y-3">
              {topClubs.map((club, i) => (
                <li
                  key={club.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                      {i + 1}
                    </span>
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {club.label}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--textSecondary)]">
                    {club.count} booking{club.count !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>

          {/* C) Most booked rooms overall */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">
              Most Booked Rooms Overall
            </h2>
            <ul className="space-y-3">
              {topRooms.map((room, i) => (
                <li
                  key={room.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">
                        {room.label}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--textSecondary)]">
                    {room.count} booking{room.count !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>

          {/* B) Top clubs per room */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col md:col-span-2"
          >
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--text)]">
              Top Clubs by Room
            </h2>
            <p className="mb-4 text-sm text-[var(--textSecondary)]">
              For each room, see the clubs that book it most often.
            </p>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {perRoomClubs.map((entry) => (
                <div
                  key={entry.roomId}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">
                        {entry.roomName}
                      </p>
                      <p className="text-xs text-[var(--textSecondary)]">
                        {getBuildingTicketLabel(entry.building)}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--textMuted)]">
                      {entry.topClubs.reduce((sum, c) => sum + c.count, 0)} total bookings
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-[var(--textSecondary)]">
                    {entry.topClubs.map((club, idx) => (
                      <li key={club.key} className="flex justify-between gap-2">
                        <span className="truncate">
                          {idx + 1}. {club.label}
                        </span>
                        <span className="shrink-0">
                          {club.count} booking{club.count !== 1 ? "s" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.section>

          {/* D) Building popularity by club */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
                Building Popularity by Club
              </h2>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-[var(--textSecondary)]">
                Select club
              </label>
              <select
                value={selectedClubKey}
                onChange={(e) => setSelectedClubKey(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
              >
                {topClubs.map((club) => (
                  <option key={club.key} value={club.key}>
                    {club.label}
                  </option>
                ))}
              </select>
            </div>
            {buildingByClub.length === 0 ? (
              <p className="text-sm text-[var(--textSecondary)]">
                No building data for this club yet.
              </p>
            ) : (
              <div className="min-h-[200px] flex-1 flex items-stretch">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={buildingByClub.map((b) => ({
                      ...b,
                      name: getBuildingTicketLabel(b.label),
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" stroke={AXIS_STROKE} tick={{ fill: "var(--textMuted)", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      stroke={AXIS_STROKE}
                      tick={{ fill: "var(--textSecondary)", fontSize: 11 }}
                      tickFormatter={(v) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--surfaceElevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        backdropFilter: "blur(16px)",
                        color: "var(--text)",
                      }}
                      labelStyle={{ color: "var(--text)", fontWeight: 600 }}
                      itemStyle={{ color: "var(--text)" }}
                      formatter={(value) => [value ?? 0, "Bookings"]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={600} animationBegin={0}>
                      {buildingByClub.map((_, i) => (
                        <Cell key={i} fill={GOLD} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.section>

          {/* E) Club booking trends over time */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col"
          >
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--text)]">
              Club Booking Trends Over Time
            </h2>
            <p className="mb-4 text-sm text-[var(--textSecondary)]">
              Booking counts grouped by date for the selected club.
            </p>
            <div className="min-h-[200px] flex-1 flex items-stretch">
              {clubTrends.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-[var(--textSecondary)]">
                  No trend data yet for this club.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clubTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
        </div>
      )}
    </div>
  );
}

