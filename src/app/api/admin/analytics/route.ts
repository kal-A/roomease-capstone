import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { ROOMS } from "@/data/rooms";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";
import { DateTime } from "luxon";
import { buildLocalDayBoundsUtc } from "@/lib/bookingTime";

type ApiBookingStatus = "pending" | "approved" | "denied" | "confirmed";

type TopCountEntry = { key: string; label: string; count: number };

type RoomClubEntry = {
  roomId: string;
  roomName: string;
  building: string;
  topClubs: TopCountEntry[];
};

type BookingRow = {
  id?: string | number | null;
  room_id?: string | number | null;
  start_time?: string | null;
  organizer_name?: string | null;
  status?: string | null;
  created_at?: string | null;
};

function normalizeOrganizer(raw: string | null | undefined): { key: string; label: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { key: "unknown", label: "Unknown Organizer" };
  return { key: trimmed.toLowerCase(), label: trimmed };
}

function normalizeStatus(raw: string | null | undefined): ApiBookingStatus | null {
  const v = String(raw ?? "").toLowerCase().trim();
  if (v === "pending" || v === "approved" || v === "denied" || v === "confirmed") return v;
  return null;
}

function toPreferredDateAndHour(startTimeIso: string): { preferredDate: string; hour: string } {
  const dt = DateTime.fromISO(String(startTimeIso)).setZone("America/Toronto");
  const preferredDate = dt.isValid ? dt.toFormat("yyyy-LL-dd") : "";
  const hour = dt.isValid ? dt.toFormat("HH") : "";
  return { preferredDate, hour };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "";
  const isAdmin = Boolean(session?.user?.isAdmin) || String(email).toLowerCase() === ADMIN_EMAIL;
  if (!session?.user?.email || !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const requestedClubKey = String(searchParams.get("club") ?? "").trim().toLowerCase();

  let startBoundUtc: string | null = null;
  let endBoundUtc: string | null = null;
  if (startDate && endDate) {
    try {
      const startBounds = buildLocalDayBoundsUtc(startDate);
      const endBounds = buildLocalDayBoundsUtc(endDate);
      startBoundUtc = startBounds.dayStartUtcIso;
      endBoundUtc = endBounds.dayEndUtcIso;
    } catch {
      return NextResponse.json({ error: "Invalid startDate/endDate" }, { status: 400 });
    }
  }

  const sb = supabaseServer();
  const select = "id,room_id,start_time,organizer_name,status,created_at";
  let query = sb.from("bookings").select(select);
  if (startBoundUtc && endBoundUtc) {
    query = query.gte("start_time", startBoundUtc).lte("start_time", endBoundUtc);
  }

  const { data, error } = await query.order("start_time", { ascending: true }).limit(5000);
  if (error) {
    console.error("SUPABASE QUERY ERROR (admin analytics)", error);
    return NextResponse.json({ error: error.message, code: error.code ?? undefined }, { status: 500 });
  }

  const roomsById = new Map(ROOMS.map((r) => [String(r.id), r]));

  // Counts
  const totalByRoom = new Map<string, { roomId: string; roomName: string; count: number }>();
  const totalByBuilding = new Map<string, number>();
  const totalByClub = new Map<string, { key: string; label: string; count: number }>();
  const funnel = { submitted: 0, pending: 0, approved: 0, denied: 0, confirmed: 0 };

  const distinctClubs = new Set<string>();
  const distinctRooms = new Set<string>();

  const roomsRequiringApproval = new Set<string>();

  // Trends/peaks
  const byDayTotal = new Map<string, number>();
  const byHourTotal = new Map<string, number>();

  // Per-room top clubs
  const perRoom = new Map<
    string,
    {
      roomId: string;
      roomName: string;
      building: string;
      clubCounts: Map<string, { key: string; label: string; count: number }>;
    }
  >();

  const bookingRows = (data ?? []) as BookingRow[];

  for (const row of bookingRows) {
    const roomId = String(row.room_id ?? "");
    if (!roomId) continue;

    const room = roomsById.get(roomId);
    const roomName = room?.name ?? roomId;
    const building = room?.building ?? "";

    distinctRooms.add(roomId);
    if (room && getRoomMetadataWithDefaults(roomId).approvalRequired === true) roomsRequiringApproval.add(roomId);

    const status = normalizeStatus(row.status ?? undefined);
    if (!status) continue;

    funnel.submitted += 1;
    if (status === "pending") funnel.pending += 1;
    else if (status === "approved") funnel.approved += 1;
    else if (status === "denied") funnel.denied += 1;
    else if (status === "confirmed") funnel.confirmed += 1;

    // Organizer / club
    const { key: clubKeyRaw, label: clubLabelRaw } = normalizeOrganizer(row.organizer_name ?? undefined);
    distinctClubs.add(clubKeyRaw);
    const clubKey = clubKeyRaw === "unknown" ? "unknown" : clubKeyRaw;

    const clubEntry = totalByClub.get(clubKey) ?? { key: clubKey, label: clubLabelRaw, count: 0 };
    // If we saw a real label after "Unknown", prefer the real one.
    if (clubEntry.label === "Unknown Organizer" && clubLabelRaw !== "Unknown Organizer") {
      clubEntry.label = clubLabelRaw;
    }
    clubEntry.count += 1;
    totalByClub.set(clubKey, clubEntry);

    // Rooms overall
    const roomEntry = totalByRoom.get(roomId) ?? { roomId, roomName, count: 0 };
    roomEntry.count += 1;
    totalByRoom.set(roomId, roomEntry);

    // Buildings overall
    if (building) totalByBuilding.set(building, (totalByBuilding.get(building) ?? 0) + 1);

    // Trends/peaks (local start_time day + hour)
    const startTimeIso = String(row.start_time ?? "");
    const { preferredDate, hour } = toPreferredDateAndHour(startTimeIso);
    if (preferredDate) byDayTotal.set(preferredDate, (byDayTotal.get(preferredDate) ?? 0) + 1);
    if (hour) byHourTotal.set(hour, (byHourTotal.get(hour) ?? 0) + 1);

    // Per-room top clubs
    let roomAgg = perRoom.get(roomId);
    if (!roomAgg) {
      roomAgg = {
        roomId,
        roomName,
        building,
        clubCounts: new Map(),
      };
      perRoom.set(roomId, roomAgg);
    }
    const existingClub = roomAgg.clubCounts.get(clubKey);
    if (existingClub) {
      existingClub.count += 1;
    } else {
      roomAgg.clubCounts.set(clubKey, { key: clubKey, label: clubLabelRaw, count: 1 });
    }
  }

  const overview = {
    totalBookings: funnel.submitted,
    pendingApprovals: funnel.pending,
    approvedBookings: funnel.approved,
    deniedBookings: funnel.denied,
    confirmedBookings: funnel.confirmed,
    activeClubsCount: distinctClubs.size,
    activeRoomsCount: distinctRooms.size,
    roomsRequiringApprovalCount: roomsRequiringApproval.size,
  };

  const topClubs: TopCountEntry[] = Array.from(totalByClub.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((x) => ({ key: x.key, label: x.label, count: x.count }));

  const topRooms: TopCountEntry[] = Array.from(totalByRoom.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((x) => ({ key: x.roomId, label: x.roomName, count: x.count }));

  const topBuildings: TopCountEntry[] = Array.from(totalByBuilding.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([building, count]) => ({ key: building, label: building, count }));

  const perRoomClubs: RoomClubEntry[] = Array.from(perRoom.values()).map((r) => {
    const topClubsForRoom = Array.from(r.clubCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((c) => ({ key: c.key, label: c.label, count: c.count }));
    return {
      roomId: r.roomId,
      roomName: r.roomName,
      building: r.building,
      topClubs: topClubsForRoom,
    };
  });

  // Match existing UI behavior: sort rooms by "top clubs total"
  perRoomClubs.sort((a, b) => {
    const aTotal = a.topClubs.reduce((sum, c) => sum + c.count, 0);
    const bTotal = b.topClubs.reduce((sum, c) => sum + c.count, 0);
    return bTotal - aTotal;
  });

  const avgBookingsPerDay = (() => {
    const days = Array.from(byDayTotal.keys());
    return days.length ? overview.totalBookings / days.length : 0;
  })();

  let peakDay: string | null = null;
  let peakDayCount = -1;
  for (const [d, c] of byDayTotal.entries()) {
    if (c > peakDayCount) {
      peakDayCount = c;
      peakDay = d;
    }
  }

  let peakHourKey: string | null = null;
  let peakHourCount = -1;
  for (const [h, c] of byHourTotal.entries()) {
    if (c > peakHourCount) {
      peakHourCount = c;
      peakHourKey = h;
    }
  }

  const peakHour = peakHourKey ? `${peakHourKey}:00` : null;

  // Club-specific insights (for selected club or default top club)
  const defaultClubKey = topClubs[0]?.key ?? "";
  const clubKey = requestedClubKey || defaultClubKey;

  const roomsByClubCounts = new Map<string, { key: string; label: string; count: number }>();
  const clubTrendsCounts = new Map<string, number>();

  if (clubKey) {
    // Re-loop filtered rows for club-specific computations.
    for (const row of bookingRows) {
      const organizer = normalizeOrganizer(row.organizer_name ?? undefined);
      const rowClubKey = organizer.key === "unknown" ? "unknown" : organizer.key;
      if (rowClubKey !== clubKey) continue;

      const roomId = String(row.room_id ?? "");
      if (!roomId) continue;
      const room = roomsById.get(roomId);
      const label = room?.name ?? roomId;

      roomsByClubCounts.set(roomId, {
        key: roomId,
        label,
        count: (roomsByClubCounts.get(roomId)?.count ?? 0) + 1,
      });

      const startTimeIso = String(row.start_time ?? "");
      const { preferredDate } = toPreferredDateAndHour(startTimeIso);
      if (preferredDate) clubTrendsCounts.set(preferredDate, (clubTrendsCounts.get(preferredDate) ?? 0) + 1);
    }
  }

  const roomsByClub: TopCountEntry[] = Array.from(roomsByClubCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((x) => ({ key: x.key, label: x.label, count: x.count }));

  const clubTrends = Array.from(clubTrendsCounts.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, bookings]) => ({ date, bookings }));

  return NextResponse.json({
    overview: {
      ...overview,
      avgBookingsPerDay,
      peakDay,
      peakHour,
    },
    topClubs,
    topRooms,
    perRoomClubs,
    topBuildings,
    approvalFunnel: {
      submitted: funnel.submitted,
      pending: funnel.pending,
      approved: funnel.approved,
      denied: funnel.denied,
      confirmed: funnel.confirmed,
    },
    defaultClubKey,
    roomsByClub,
    clubTrends,
  });
}

