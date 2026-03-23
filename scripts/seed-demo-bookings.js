/**
 * Demo seed: realistic booking data for presentations.
 *
 * SAFETY:
 * - This uses the Supabase *service role* key and therefore bypasses RLS.
 * - By default, it runs as a dry-run (read-only). Use `--apply` to actually insert.
 * - If you want to reset and re-insert, use `--cleanup --apply`.
 *
 * Usage:
 *   node scripts/seed-demo-bookings.js --anchor=2026-03-01
 *   node scripts/seed-demo-bookings.js --apply
 *   node scripts/seed-demo-bookings.js --cleanup --apply
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotency:
 * - Deterministic bookings are generated from the `--anchor` date (default: "today"
 *   in America/Toronto). Re-running with the same anchor will not create duplicates.
 */

const { createClient } = require("@supabase/supabase-js");
const { DateTime } = require("luxon");
const clubsJson = require("../src/data/clubs.json");
const fs = require("fs");
const path = require("path");

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
} = process.env;

const ROOM_IDS = ["AL-209", "AL-210", "CPH-1346", "MC-2035"];

const DEMO_USERS = [
  { email: "fvalli@uwaterloo.ca", name: "Farhan Valli", isAdmin: true },
  { email: "g5rai@uwaterloo.ca", name: "Gurman Rai", isAdmin: false },
  { email: "p73gupta@uwaterloo.ca", name: "Pranav Gupta", isAdmin: false },
  { email: "k4ahsan@uwaterloo.ca", name: "Kamal Ahsan", isAdmin: false },
  { email: "sjeyapal@uwaterloo.ca", name: "Jey Jeyapalan", isAdmin: false },
];

const DEMO_NON_ADMIN_USERS = DEMO_USERS.filter((u) => !u.isAdmin);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function loadEnvFileIfPresent(envFilePath) {
  if (!fs.existsSync(envFilePath)) return;

  const raw = fs.readFileSync(envFilePath, "utf8");
  const lines = raw.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const eqIdx = normalized.indexOf("=");
    if (eqIdx === -1) continue;

    const key = normalized.slice(0, eqIdx).trim();
    let value = normalized.slice(eqIdx + 1).trim();

    // Remove surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] == null) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = new Set(argv);
  const anchorArg = argv.find((a) => a.startsWith("--anchor="));
  const anchorStr = anchorArg ? anchorArg.split("=", 2)[1] : null;
  return {
    apply: args.has("--apply"),
    cleanup: args.has("--cleanup"),
    anchorStr,
  };
}

function normalizeClubName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ");
}

function buildCleanClubNames() {
  const rawNames = Array.isArray(clubsJson)
    ? clubsJson
        .map((c) => (typeof c?.name === "string" ? c.name.trim() : ""))
        .filter(Boolean)
    : [];

  // Keep in sync with `src/lib/clubs.ts` filtering behavior (approx).
  const EXPLICIT_EXCLUDE = new Set(["200 University Avenue West"]);
  const isLikelyValidClubName = (name) => {
    if (EXPLICIT_EXCLUDE.has(name)) return false;
    if (!/[A-Za-z]/.test(name)) return false;
    if (name.length < 3) return false;
    return true;
  };

  const unique = new Set();
  for (const name of rawNames) {
    const cleaned = normalizeClubName(name);
    if (!isLikelyValidClubName(cleaned)) continue;
    unique.add(cleaned);
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

function pick(arr, idx) {
  return arr[((idx % arr.length) + arr.length) % arr.length];
}

function isoDateFromAnchor(dt) {
  return dt.toISODate(); // YYYY-MM-DD
}

function makeLocalDateTime(anchorLocal, daysOffset, hour, minute) {
  return anchorLocal.plus({ days: daysOffset }).set({ hour, minute, second: 0, millisecond: 0 });
}

function makeIsoUtc(dtLocal) {
  // Supabase timestamptz: send UTC ISO string.
  return dtLocal.toUTC().toISO();
}

function eventTitleTemplates() {
  return [
    "{club} Weekly Meeting",
    "{club} Seminar Series",
    "{club} Study Session",
    "{club} Workshop Night",
    "{club} Club Social",
    "{club} Project Planning Session",
    "{club} Information Session",
    "{club} Community Meetup",
    "{club} Presentation Practice",
  ];
}

function buildTimeOptions() {
  // Keep end times before 22:30 for the same-day assumption.
  return [
    { hour: 10, minute: 0, durationMin: 90 }, // ends 11:30
    { hour: 13, minute: 30, durationMin: 120 }, // ends 15:30
    { hour: 15, minute: 0, durationMin: 90 }, // ends 16:30
    { hour: 18, minute: 0, durationMin: 120 }, // ends 20:00
    { hour: 19, minute: 0, durationMin: 90 }, // ends 20:30
  ];
}

function buildBookingStatusPlan(roomRequiresApproval, bookingIndex, roomIndex) {
  // bookingIndex is 0..7 for 8 seeded date offsets per room.
  // For approval-required rooms:
  // - Admin primarily creates approved, sometimes denied.
  // - Non-admin primarily creates pending, sometimes denied.
  // For non-approval rooms:
  // - confirmed.
  if (!roomRequiresApproval) return { status: "confirmed", wantsAdmin: false };

  // Deterministic distribution across the 8 bookings:
  // 0 -> approved, 1 -> pending, 2 -> pending, 3 -> denied,
  // 4 -> pending, 5 -> approved, 6 -> pending, 7 -> denied
  const seq = ["approved", "pending", "pending", "denied", "pending", "approved", "pending", "denied"];
  const status = seq[bookingIndex] ?? "pending";
  const wantsAdmin = status === "approved";
  // Ensure non-admin can still be denied.
  return { status, wantsAdmin };
}

// Load local env for convenience when running from a shell.
// Note: this is still demo-only; it just avoids manual export.
loadEnvFileIfPresent(path.join(__dirname, "../.env.local"));
loadEnvFileIfPresent(path.join(__dirname, "../.env"));

async function run() {
  const { apply, cleanup, anchorStr } = parseArgs(process.argv.slice(2));

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const anchorLocalDate = anchorStr
    ? DateTime.fromISO(anchorStr, { zone: "America/Toronto" })
    : DateTime.now().setZone("America/Toronto");

  if (!anchorLocalDate.isValid) {
    throw new Error(`Invalid --anchor value: ${anchorStr}`);
  }

  const anchorLocal = anchorLocalDate.startOf("day");
  const anchorISODate = isoDateFromAnchor(anchorLocal);

  console.log(`[seed-demo-bookings] anchor=${anchorISODate} apply=${apply} cleanup=${cleanup}`);

  // Fetch requires_approval flags from the real rooms table so the seed respects business logic.
  const { data: roomsData, error: roomsError } = await sb
    .from("rooms")
    .select("id, requires_approval")
    .in("id", ROOM_IDS);

  if (roomsError) {
    throw new Error(`Failed to load rooms.requires_approval: ${roomsError.message}`);
  }

  const requiresApprovalByRoom = new Map();
  for (const row of roomsData ?? []) {
    requiresApprovalByRoom.set(String(row.id), row.requires_approval === true);
  }
  // Sensible fallback: AL rooms require approval.
  for (const roomId of ROOM_IDS) {
    if (!requiresApprovalByRoom.has(roomId)) {
      requiresApprovalByRoom.set(roomId, roomId.startsWith("AL-"));
    }
  }

  const clubNames = buildCleanClubNames();
  const otherClubs = clubNames.filter(
    (n) => n !== "Waterloo Quantum Club" && n !== "Waterloo Punjabi Association (WPA)"
  );

  const primaryQuantum = "Waterloo Quantum Club";
  const primaryWpa = "Waterloo Punjabi Association (WPA)";

  const timeOptions = buildTimeOptions();
  const templates = eventTitleTemplates();

  // Past 2–6 weeks plus future:
  // (anchorLocalDate is "today" by default; offsets create realism for charts)
  const dateOffsetsDays = [-42, -35, -28, -21, -14, -7, +1, +10];
  // Deterministic deterministic: 8 date offsets per room => 32 seeded bookings total.

  // Generate deterministic bookings.
  const allPayloads = [];

  for (let roomIndex = 0; roomIndex < ROOM_IDS.length; roomIndex++) {
    const roomId = ROOM_IDS[roomIndex];
    const roomRequiresApproval = requiresApprovalByRoom.get(roomId) === true;

    for (let bookingIndex = 0; bookingIndex < dateOffsetsDays.length; bookingIndex++) {
      const daysOffset = dateOffsetsDays[bookingIndex];

      const timePick = timeOptions[(roomIndex * 3 + bookingIndex) % timeOptions.length];
      const startLocal = makeLocalDateTime(anchorLocal, daysOffset, timePick.hour, timePick.minute);
      const endLocal = startLocal.plus({ minutes: timePick.durationMin });

      // Choose club / organizer distribution.
      let organizerName;
      if (roomId === "CPH-1346") {
        // Quantum tends to dominate CPH.
        const dominant = (bookingIndex % 5 === 0 || bookingIndex % 5 === 1) ? primaryQuantum : pick(otherClubs, roomIndex + bookingIndex);
        organizerName = dominant;
      } else if (roomId === "AL-209" || roomId === "AL-210") {
        // WPA dominates the AL rooms.
        const dominant = (bookingIndex % 3 === 0 || bookingIndex % 3 === 1) ? primaryWpa : pick(otherClubs, roomIndex + bookingIndex * 2);
        organizerName = dominant;
      } else {
        // MC-2035: mixed usage.
        const roll = bookingIndex % 6;
        if (roll === 0 || roll === 1) organizerName = primaryQuantum;
        else if (roll === 2 || roll === 3) organizerName = primaryWpa;
        else organizerName = pick(otherClubs, roomIndex + bookingIndex);
      }

      organizerName = normalizeClubName(organizerName);
      if (!organizerName) organizerName = "Unknown Organizer";

      // Status + booker logic.
      const { status, wantsAdmin } = buildBookingStatusPlan(roomRequiresApproval, bookingIndex, roomIndex);

      let booker = null;
      if (wantsAdmin) {
        booker = DEMO_USERS.find((u) => u.isAdmin) ?? DEMO_USERS[0];
      } else {
        // Prefer non-admin users for pending/denied.
        booker = pick(DEMO_NON_ADMIN_USERS, roomIndex * 17 + bookingIndex * 7);
      }

      // For non-approval rooms, keep it mostly confirmed and mostly non-admin.
      if (!roomRequiresApproval) {
        if (status !== "confirmed") {
          // Defensive; should not happen with our plan function.
          throw new Error(`Expected confirmed status for non-approval room ${roomId}`);
        }
        // Make a subset admin to diversify.
        if (bookingIndex % 5 === 0) {
          booker = DEMO_USERS.find((u) => u.isAdmin) ?? DEMO_USERS[0];
        }
      }

      // Group size: pick a plausible number based on room capacity if available.
      // If capacity isn't accessible, still keep it realistic.
      const groupSizeBase = 18 + ((roomIndex + bookingIndex) % 9) * 3; // ~18..42
      const group_size = Math.max(6, groupSizeBase);

      const template = templates[(roomIndex * 11 + bookingIndex) % templates.length];
      const event_name = template.replace("{club}", organizerName);

      const start_time = makeIsoUtc(startLocal);
      const end_time = makeIsoUtc(endLocal);
      const created_at = makeIsoUtc(startLocal.minus({ days: 1 + (bookingIndex % 3), hours: bookingIndex % 5 }));

      // Soft validation for UI/business logic.
      if (!start_time || !end_time) throw new Error("Failed to build ISO timestamps");
      if (DateTime.fromISO(end_time) <= DateTime.fromISO(start_time)) {
        throw new Error(`Invalid interval: ${roomId} start=${start_time} end=${end_time}`);
      }

      allPayloads.push({
        room_id: roomId,
        organizer_name: organizerName,
        event_name,
        group_size,
        start_time,
        end_time,
        booker_email: booker.email,
        booker_name: booker.name,
        status,
        created_at,
      });
    }
  }

  console.log(`[seed-demo-bookings] generated payloads: ${allPayloads.length}`);

  const demoEmailSet = new Set(DEMO_USERS.map((u) => u.email));

  const minStart = allPayloads.reduce((min, p) => (p.start_time < min ? p.start_time : min), allPayloads[0].start_time);
  const maxStart = allPayloads.reduce((max, p) => (p.start_time > max ? p.start_time : max), allPayloads[0].start_time);

  const existingKeySet = new Set();
  {
    const { data: existingRows, error: existingError } = await sb
      .from("bookings")
      .select("id,room_id,start_time,end_time,booker_email,organizer_name,status")
      .in("booker_email", Array.from(demoEmailSet))
      .in("room_id", ROOM_IDS)
      .gte("start_time", minStart)
      .lte("start_time", maxStart);

    if (existingError) throw new Error(`Failed to load existing bookings: ${existingError.message}`);

    for (const r of existingRows ?? []) {
      // Idempotency: consider a slot the "same" booking regardless of current `status`.
      // (So if admin actions updated status, we still won't attempt to insert duplicates and fail on constraints.)
      const key = `${String(r.room_id)}|${String(r.start_time)}|${String(r.end_time)}|${String(r.booker_email)}|${String(
        r.organizer_name
      )}`;
      existingKeySet.add(key);
    }
  }

  const payloadKey = (p) =>
    `${p.room_id}|${p.start_time}|${p.end_time}|${p.booker_email}|${p.organizer_name}`;

  const toInsert = [];
  const toSkip = [];
  for (const p of allPayloads) {
    const key = payloadKey(p);
    if (existingKeySet.has(key)) toSkip.push(p);
    else toInsert.push(p);
  }

  // Compute a quick status distribution preview.
  const statusDist = allPayloads.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[seed-demo-bookings] preview: toInsert=${toInsert.length} toSkip=${toSkip.length}`);
  console.log(`[seed-demo-bookings] preview: statuses=${JSON.stringify(statusDist)}`);

  if (!apply) {
    console.log("[seed-demo-bookings] DRY RUN complete. No changes were made.");
    return;
  }

  if (cleanup) {
    // Delete exact matches for this deterministic set (same anchor).
    const keysWanted = new Set(allPayloads.map(payloadKey));
    const existingIdsToDelete = [];

    // Re-query only for the deterministic slice, then delete by keysWanted.
    const { data: rowsToConsider, error: considerError } = await sb
      .from("bookings")
      .select("id,room_id,start_time,end_time,booker_email,organizer_name,status")
      .in("booker_email", Array.from(demoEmailSet))
      .in("room_id", ROOM_IDS)
      .gte("start_time", minStart)
      .lte("start_time", maxStart);

    if (considerError) throw new Error(`Failed to load rows for cleanup: ${considerError.message}`);

    for (const r of rowsToConsider ?? []) {
      const key = `${String(r.room_id)}|${String(r.start_time)}|${String(r.end_time)}|${String(r.booker_email)}|${String(
        r.organizer_name
      )}`;
      if (keysWanted.has(key)) existingIdsToDelete.push(r.id);
    }

    if (existingIdsToDelete.length > 0) {
      console.log(`[seed-demo-bookings] cleanup: deleting ${existingIdsToDelete.length} matching rows...`);
      const { error: deleteError } = await sb.from("bookings").delete().in("id", existingIdsToDelete);
      if (deleteError) throw new Error(`Cleanup delete failed: ${deleteError.message}`);
    } else {
      console.log("[seed-demo-bookings] cleanup: nothing to delete (matches not found).");
    }
  }

  const insertCandidates = cleanup ? allPayloads : toInsert;
  if (insertCandidates.length === 0) {
    console.log("[seed-demo-bookings] No new bookings needed (already seeded for this anchor).");
  } else {
    // Avoid DB exclusion constraint failures by skipping any candidate that overlaps
    // an existing booking in the same room.
    const selectedByRoom = new Map(); // room_id -> array of { start_time, end_time }
    const safePayloads = [];
    let skippedDueToOverlap = 0;
    let skippedDueToInternalOverlap = 0;

    for (const p of insertCandidates) {
      const roomId = p.room_id;
      const roomSelected = selectedByRoom.get(roomId) ?? [];

      // Internal overlap guard (between payloads chosen in this run).
      const pStart = DateTime.fromISO(p.start_time);
      const pEnd = DateTime.fromISO(p.end_time);
      const overlapsInternal = roomSelected.some((r) => {
        const rStart = DateTime.fromISO(r.start_time);
        const rEnd = DateTime.fromISO(r.end_time);
        return rStart < pEnd && rEnd > pStart;
      });
      if (overlapsInternal) {
        skippedDueToInternalOverlap++;
        continue;
      }

      const { data: overlapsRows, error: overlapError } = await sb
        .from("bookings")
        .select("id")
        .eq("room_id", roomId)
        .lt("start_time", p.end_time)
        .gt("end_time", p.start_time)
        .limit(1);

      if (overlapError) throw new Error(`Overlap check failed: ${overlapError.message}`);
      if ((overlapsRows ?? []).length > 0) {
        skippedDueToOverlap++;
        continue;
      }

      roomSelected.push({ start_time: p.start_time, end_time: p.end_time });
      selectedByRoom.set(roomId, roomSelected);
      safePayloads.push(p);
    }

    console.log(
      `[seed-demo-bookings] inserting safe bookings: ${safePayloads.length} (skipped overlap=${skippedDueToOverlap}, internalOverlap=${skippedDueToInternalOverlap})`
    );

    if (safePayloads.length > 0) {
      const { error: insertError } = await sb.from("bookings").insert(
        safePayloads.map((p) => ({
          room_id: p.room_id,
          event_name: p.event_name,
          organizer_name: p.organizer_name,
          group_size: p.group_size,
          start_time: p.start_time,
          end_time: p.end_time,
          booker_email: p.booker_email,
          booker_name: p.booker_name,
          status: p.status,
          created_at: p.created_at,
        }))
      );

      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    }
  }

  // Post-insert verification summary.
  const { data: summaryRows, error: summaryError } = await sb
    .from("bookings")
    .select("status")
    .in("booker_email", Array.from(demoEmailSet))
    .in("room_id", ROOM_IDS)
    .gte("start_time", minStart)
    .lte("start_time", maxStart);

  if (summaryError) throw new Error(`Failed to compute summary: ${summaryError.message}`);

  const summaryDist = (summaryRows ?? []).reduce((acc, r) => {
    const s = String(r.status ?? "");
    if (!s) return acc;
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[seed-demo-bookings] done. Status distribution in seeded window: ${JSON.stringify(summaryDist)}`);

  // Lightweight "analytics sanity checks" for the demo dataset.
  const { data: detailRows, error: detailError } = await sb
    .from("bookings")
    .select("room_id,organizer_name,status")
    .in("booker_email", Array.from(demoEmailSet))
    .in("room_id", ROOM_IDS)
    .gte("start_time", minStart)
    .lte("start_time", maxStart);

  if (detailError) throw new Error(`Failed to compute analytics sanity checks: ${detailError.message}`);

  const organizerCounts = {};
  const roomCounts = {};
  for (const r of detailRows ?? []) {
    const organizer = normalizeClubName(r.organizer_name) || "Unknown Organizer";
    organizerCounts[organizer] = (organizerCounts[organizer] ?? 0) + 1;
    const roomId = String(r.room_id);
    roomCounts[roomId] = (roomCounts[roomId] ?? 0) + 1;
  }

  const topOrganizers = Object.entries(organizerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topRooms = Object.entries(roomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([room_id, count]) => ({ room_id, count }));

  const perRoomOrganizer = new Map(); // room_id -> { organizer: count }
  for (const r of detailRows ?? []) {
    const roomId = String(r.room_id);
    const organizer = normalizeClubName(r.organizer_name) || "Unknown Organizer";
    const bucket = perRoomOrganizer.get(roomId) ?? {};
    bucket[organizer] = (bucket[organizer] ?? 0) + 1;
    perRoomOrganizer.set(roomId, bucket);
  }

  const perRoomTopClubs = [];
  for (const roomId of ROOM_IDS) {
    const bucket = perRoomOrganizer.get(roomId) ?? {};
    const top = Object.entries(bucket)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    perRoomTopClubs.push({ room_id: roomId, top_clubs: top });
  }

  console.log(`[seed-demo-bookings] top organizers in seeded window: ${JSON.stringify(topOrganizers)}`);
  console.log(`[seed-demo-bookings] top rooms in seeded window: ${JSON.stringify(topRooms)}`);
  console.log(`[seed-demo-bookings] top clubs per room in seeded window: ${JSON.stringify(perRoomTopClubs)}`);
}

run().catch((e) => {
  console.error("[seed-demo-bookings] ERROR:", e?.message ?? e);
  process.exit(1);
});

