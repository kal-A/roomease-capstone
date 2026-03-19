/**
 * One-time demo/prod safety: sync all frontend rooms into Supabase.
 *
 * This script is intentionally safe to re-run:
 * - deterministic upsert by `rooms.id`
 * - preserves `requires_approval` when a room already exists
 *
 * Usage:
 *   node scripts/sync-rooms-to-supabase.js                # dry-run (no changes)
 *   node scripts/sync-rooms-to-supabase.js --apply       # perform upserts
 *
 * Requirements:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Reads source of truth from: src/data/rooms.json
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const rooms = require("../src/data/rooms.json");

// Mirror the small explicit approval-required overlay from `src/data/roomMetadata.ts`.
// Keeping it inline avoids importing TS modules from a Node script.
const EXPLICIT_REQUIRES_APPROVAL = new Set(["AL-209", "AL-210"]);

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFileIfPresent(path.join(__dirname, "../.env.local"));
loadEnvFileIfPresent(path.join(__dirname, "../.env"));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  return { apply };
}

function normalizeId(rawId) {
  const s = String(rawId ?? "").trim().toUpperCase();
  if (!s) return "";

  // Normalize whitespace/hyphens first.
  let t = s.replace(/\s+/g, "-").replace(/-+/g, "-");

  // If already contains a hyphen, keep it (after normalization).
  if (t.includes("-")) return t;

  // Heuristic for cases like: B12171 -> B1-2171
  const m = t.match(/^([A-Z]+)(\d+)$/);
  if (m) {
    const letters = m[1];
    const digits = m[2];
    if (letters.length === 1 && digits.length >= 5) {
      // Treat first digit as part of building code (B1-2171 style).
      return `${letters}${digits[0]}-${digits.slice(1)}`;
    }
    // Default: separate letters from digits (MC2035 -> MC-2035)
    return `${letters}-${digits}`;
  }

  // Fallback: best-effort (remove double hyphens already handled).
  return t;
}

function deriveBuildingAndRoomNumber(normalizedId) {
  const t = String(normalizedId ?? "").trim().toUpperCase();
  const parts = t.split("-");
  if (parts.length >= 2) {
    return {
      building: parts[0],
      room_number: parts.slice(1).join("-"),
    };
  }
  return { building: "", room_number: "" };
}

function toBool(v) {
  return v === true || String(v).toLowerCase() === "true";
}

function toInt(v) {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function run() {
  const { apply } = parseArgs(process.argv.slice(2));
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const sourceRooms = Array.isArray(rooms) ? rooms : [];
  console.log(`[sync-rooms-to-supabase] source rooms: ${sourceRooms.length} apply=${apply}`);

  const normalizedRooms = [];
  const skipped = [];
  for (const r of sourceRooms) {
    const normalizedId = normalizeId(r.id);
    const { building, room_number } = deriveBuildingAndRoomNumber(normalizedId);

    if (!normalizedId || !building || !room_number) {
      skipped.push({ id: r.id, reason: "Could not derive canonical id/building/room_number" });
      continue;
    }

    normalizedRooms.push({
      id: normalizedId,
      building,
      room_number: String(room_number),
      name: String(r.name ?? r.id ?? normalizedId),
      capacity: toInt(r.capacity),
      furniture: String(r.furniture ?? ""),
      av_capable: toBool(r.avCapable ?? false),
      doc_camera: toBool(r.docCamera ?? false),
      accessible: toBool(r.accessible ?? false),
      // requires_approval is set later (preserve existing, else metadata overlay)
    });
  }

  const allIds = normalizedRooms.map((x) => x.id);
  const byIdExisting = new Map();
  for (const idChunk of chunk(allIds, 150)) {
    const { data, error } = await sb
      .from("rooms")
      .select("id, requires_approval")
      .in("id", idChunk);
    if (error) throw new Error(`Failed to load existing rooms: ${error.message}`);
    for (const row of data ?? []) {
      byIdExisting.set(String(row.id), row.requires_approval === true);
    }
  }

  const roomsToUpsert = normalizedRooms.map((r) => {
    const existingRequiresApproval = byIdExisting.get(r.id);
    const explicitRequiresApproval = EXPLICIT_REQUIRES_APPROVAL.has(r.id);

    return {
      ...r,
      requires_approval:
        typeof existingRequiresApproval === "boolean" ? existingRequiresApproval : explicitRequiresApproval,
    };
  });

  if (!apply) {
    console.log(`[sync-rooms-to-supabase] DRY RUN: would upsert ${roomsToUpsert.length} rooms.`);
    if (skipped.length) console.log(`[sync-rooms-to-supabase] skipped=${skipped.length}`, skipped.slice(0, 5));
    return;
  }

  let insertedOrUpdated = 0;
  for (const batch of chunk(roomsToUpsert, 150)) {
    const { error } = await sb
      .from("rooms")
      .upsert(
        batch.map((r) => ({
          id: r.id,
          building: r.building,
          room_number: r.room_number,
          name: r.name,
          capacity: r.capacity,
          furniture: r.furniture,
          av_capable: r.av_capable,
          doc_camera: r.doc_camera,
          accessible: r.accessible,
          requires_approval: r.requires_approval,
        })),
        { onConflict: "id" }
      );
    if (error) throw new Error(`Upsert failed: ${error.message}`);
    insertedOrUpdated += batch.length;
  }

  console.log(
    `[sync-rooms-to-supabase] complete. upserted=${insertedOrUpdated} (skipped=${skipped.length})`
  );
}

run().catch((e) => {
  console.error("[sync-rooms-to-supabase] ERROR:", e?.message ?? e);
  process.exit(1);
});

