"use client";

import { useMemo } from "react";
import Link from "next/link";
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
import { useBookings } from "@/lib/bookingsStore";
import { getBuildingTicketLabel } from "@/lib/buildings";

const GOLD = "var(--primary)";
const GOLD_DIM = "var(--primary)";
const AXIS_STROKE = "var(--textMuted)";
const GRID_STROKE = "var(--border)";

function useAnalyticsData(bookings: ReturnType<typeof useBookings>["bookings"]) {
  return useMemo(() => {
    const buildingCount: Record<string, number> = {};
    const roomCount: Record<string, { count: number; roomName: string; building: string }> = {};
    const capacityBuckets = { small: 0, medium: 0, large: 0 };
    const byDay: Record<string, number> = {};

    for (const b of bookings) {
      buildingCount[b.building] = (buildingCount[b.building] ?? 0) + 1;
      if (!roomCount[b.roomId]) {
        roomCount[b.roomId] = { count: 0, roomName: b.roomName, building: b.building };
      }
      roomCount[b.roomId].count += 1;

      if (b.capacity <= 50) capacityBuckets.small += 1;
      else if (b.capacity <= 150) capacityBuckets.medium += 1;
      else capacityBuckets.large += 1;

      const day = b.preferredDate;
      byDay[day] = (byDay[day] ?? 0) + 1;
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
      { name: "Small (0–50)", value: capacityBuckets.small, fill: "var(--textMuted)" },
      { name: "Medium (50–150)", value: capacityBuckets.medium, fill: "var(--textSecondary)" },
      { name: "Large (150+)", value: capacityBuckets.large, fill: GOLD_DIM },
    ];

    const sortedDays = Object.keys(byDay).sort();
    const trendsData = sortedDays.map((day) => ({ date: day, bookings: byDay[day] }));

    return { byBuildingList, byRoomList, capacityData, trendsData };
  }, [bookings]);
}

export default function AnalyticsPage() {
  const { bookings } = useBookings();
  const { byBuildingList, byRoomList, capacityData, trendsData } = useAnalyticsData(bookings);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
          Booking Analytics
        </h1>
        <p className="mt-2 text-lg text-[var(--textSecondary)]">
          Most booked buildings, popular rooms, capacity distribution, and trends.
        </p>
      </div>

      {bookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] backdrop-blur-md py-20 text-center"
        >
          <p className="text-lg font-medium text-[var(--textSecondary)]">No bookings yet</p>
          <p className="mt-2 text-sm text-[var(--textMuted)]">Analytics will appear once you have bookings.</p>
          <Link
            href="/book"
            className="mt-6 inline-flex rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-black shadow-lg transition-all duration-200 hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
          >
            Book a Room
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 auto-rows-fr" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
          {/* Section 1 — Most Booked Buildings (bar chart) */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col min-h-0"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">Most Booked Buildings</h2>
            <div className="min-h-[200px] flex-1 flex items-stretch">
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
                    }}
                    labelStyle={{ color: "var(--text)" }}
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col min-h-0"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">Most Booked Rooms</h2>
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
                    <span className="text-sm text-[var(--textSecondary)]">{count} booking{count !== 1 ? "s" : ""}</span>
                    <Link
                      href={`/book?roomId=${encodeURIComponent(roomId)}`}
                      className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                    >
                      Book this room
                    </Link>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          {/* Section 3 — Capacity Distribution (histogram) */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col min-h-0"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">Capacity Distribution</h2>
            <div className="min-h-[200px] flex-1 flex items-stretch">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={capacityData}
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
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
                      }}
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

          {/* Section 4 — Booking Trends (line chart) */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg flex flex-col min-h-0"
          >
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text)]">Booking Trends</h2>
            <div className="min-h-[200px] flex-1 flex items-stretch">
              {trendsData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-[var(--textSecondary)]">No date data yet</p>
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
                      }}
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
