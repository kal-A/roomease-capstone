/**
 * Converts Bookable Rooms.xlsx sheet "REG Rooms" to rooms.json.
 * Sheet has TWO room tables side-by-side. Column layout:
 *   Left:  STC (feature), Bldg/Room, Regular Capacity, Furniture
 *   Right: (col 4 = feature), Bldg/Room.1, Regular Capacity.1, Furniture.1
 * Furniture Legend at end is ignored.
 * Run: yarn rooms:convert
 * Output: src/data/rooms.json, src/data/rooms.skipped.json (debug)
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const INPUT_PATH = path.join(__dirname, "../src/data/Bookable Rooms.xlsx");
const OUTPUT_PATH = path.join(__dirname, "../src/data/rooms.json");
const SKIPPED_PATH = path.join(__dirname, "../src/data/rooms.skipped.json");
const SHEET_NAME = "REG Rooms";

const LEFT = { feature: 0, bldgRoom: 1, capacity: 2, furniture: 3 };
const RIGHT = { feature: 4, bldgRoom: 5, capacity: 6, furniture: 7 };

/**
 * Raw building guess: first 2–6 uppercase letters/digits at start (building-like).
 * "RCH 305" => "RCH", "AHS - 032A" => "AHS", "B1 271" => "B1"
 */
function rawBuildingGuess(s) {
  const t = String(s ?? "").trim();
  const match = t.match(/^([A-Z][A-Z0-9]{1,5})/i);
  if (match) return match[1].toUpperCase();
  return null;
}

/**
 * Normalize Bldg/Room string: uppercase, trim, replace " - " and "-" with " ", collapse spaces.
 */
function normalizeBldgRoom(val) {
  let s = typeof val === "string" ? val : String(val ?? "");
  s = s.trim().toUpperCase();
  s = s.replace(/\s*-\s*/g, " ").replace(/-/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Parse "Bldg/Room" robustly.
 * - Normalize: uppercase, trim, hyphens to space, collapse spaces
 * - Match building: start with one letter then 1–5 alphanumeric (e.g. RCH, AHS, B1, E2, EV1)
 * - roomNumber = remainder (may include letters, e.g. 032A, 3522A)
 * Returns { building, roomNumber } or null with reason.
 */
function parseBldgRoom(val) {
  const s = normalizeBldgRoom(val);
  if (!s) return { building: "", roomNumber: "", reason: "missing room" };
  const match = s.match(/^([A-Z][A-Z0-9]{1,5})\s+(.+)$/);
  if (!match) return { building: "", roomNumber: "", reason: "could not parse building" };
  const building = match[1];
  const roomNumber = match[2].trim();
  if (!roomNumber) return { building: "", roomNumber: "", reason: "could not parse building" };
  return { building, roomNumber, reason: null };
}

/** SR = AV capable, D = doc camera. * ignored. */
function parseFeatureCode(val) {
  const raw = typeof val === "string" ? val.trim() : String(val ?? "").trim();
  const upper = raw.toUpperCase().replace(/\*/g, "");
  return {
    rawFeatureCode: raw || undefined,
    avCapable: upper.includes("SR"),
    docCamera: upper.includes("D"),
  };
}

function parseCapacity(val) {
  if (typeof val === "number" && !Number.isNaN(val)) return Math.max(0, Math.floor(val));
  if (typeof val === "string") {
    const n = parseInt(val.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? null : Math.max(0, n);
  }
  return null;
}

/**
 * Extract one room from a row/block. Returns room object or null.
 * skippedReason set when we skip (for caller to push to skipped[]).
 */
function extractRoom(row, block) {
  const bldgRoomRaw = String(row[block.bldgRoom] ?? "").trim();
  const capVal = row[block.capacity];
  const capacity = parseCapacity(capVal);

  if (!bldgRoomRaw) return { room: null, reason: "missing room", rawRoom: bldgRoomRaw || "(empty)" };
  if (capacity === null || capacity <= 0) {
    if (capacity === null) return { room: null, reason: "capacity not a number", rawRoom: bldgRoomRaw };
    return { room: null, reason: "missing capacity", rawRoom: bldgRoomRaw };
  }

  const parsed = parseBldgRoom(bldgRoomRaw);
  if (parsed.reason) return { room: null, reason: parsed.reason, rawRoom: bldgRoomRaw };

  const { building, roomNumber } = parsed;
  const featureVal = String(row[block.feature] ?? "").trim();
  const { rawFeatureCode, avCapable, docCamera } = parseFeatureCode(featureVal);
  const furniture = String(row[block.furniture] ?? "").trim() || undefined;

  return {
    room: {
      id: `${building}-${roomNumber}`,
      name: `${building} ${roomNumber}`,
      building,
      roomNumber,
      capacity,
      furniture,
      avCapable,
      docCamera,
      rawFeatureCode,
      accessible: false,
    },
    reason: null,
    rawRoom: bldgRoomRaw,
  };
}

function isLegendRow(row) {
  const str = String(row[0] ?? "").toLowerCase() + String(row[LEFT.bldgRoom] ?? "").toLowerCase();
  if (str.includes("furniture legend") || str.includes("legend")) return true;
  const last = row[row.length - 1];
  if (String(last ?? "").toLowerCase().includes("=")) return true;
  return false;
}

function run() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error("Input file not found:", INPUT_PATH);
    process.exit(1);
  }

  const workbook = XLSX.readFile(INPUT_PATH);
  if (!workbook.SheetNames.includes(SHEET_NAME)) {
    console.error(`Sheet "${SHEET_NAME}" not found.`);
    process.exit(1);
  }

  const sheet = workbook.Sheets[SHEET_NAME];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 2) {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify([], null, 2));
    fs.writeFileSync(SKIPPED_PATH, JSON.stringify([], null, 2));
    console.log("Total raw room strings: 0");
    console.log("Unique raw building guesses: (none)");
    console.log("Rooms written: 0");
    console.log("Rooms skipped: 0");
    return;
  }

  // —— QA: collect raw room strings from BOTH sides before filtering ——
  const rawRoomStrings = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isLegendRow(row)) continue;
    for (const block of [LEFT, RIGHT]) {
      const val = row[block.bldgRoom];
      const s = typeof val === "string" ? val.trim() : String(val ?? "").trim();
      if (s) rawRoomStrings.push(s);
    }
  }
  const guesses = new Set();
  for (const s of rawRoomStrings) {
    const g = rawBuildingGuess(s);
    if (g) guesses.add(g);
  }
  const uniqueGuesses = Array.from(guesses).sort((a, b) => a.localeCompare(b));
  console.log("=== Conversion QA (before filtering) ===");
  console.log("Total raw room strings found:", rawRoomStrings.length);
  console.log("Unique raw building guesses (sorted):", uniqueGuesses.join(", ") || "(none)");
  console.log("");

  const seenIds = new Set();
  const rooms = [];
  const skipped = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isLegendRow(row)) continue;

    for (const block of [LEFT, RIGHT]) {
      const side = block === LEFT ? "left" : "right";
      const result = extractRoom(row, block, side);
      if (result.room) {
        if (seenIds.has(result.room.id)) continue;
        seenIds.add(result.room.id);
        rooms.push(result.room);
      } else {
        skipped.push({ rawRoom: result.rawRoom, side, reason: result.reason });
      }
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rooms, null, 2), "utf8");
  fs.writeFileSync(SKIPPED_PATH, JSON.stringify(skipped, null, 2), "utf8");

  console.log("=== Conversion result ===");
  console.log("Rooms written:", rooms.length);
  console.log("Rooms skipped:", skipped.length);
  console.log("Output:", OUTPUT_PATH);
  console.log("Skipped log:", SKIPPED_PATH);
  console.log("");
  console.log("Top 25 skipped (rawRoom, side, reason):");
  skipped.slice(0, 25).forEach((s, i) => {
    console.log(`  ${i + 1}. "${s.rawRoom}" [${s.side}] ${s.reason}`);
  });
}

run();
