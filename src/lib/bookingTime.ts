export type BookingRangeInput = {
  /** Local date: YYYY-MM-DD */
  preferredDate: string;
  /** Local start time: HH:MM (24h) */
  timeSlot: string;
  /** Duration in minutes */
  durationMinutes: number;
};

function parseYmd(date: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function parseHm(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

export function buildBookingRange(input: BookingRangeInput): { startTimeIsoUtc: string; endTimeIsoUtc: string } {
  const ymd = parseYmd(input.preferredDate);
  const hm = parseHm(input.timeSlot);
  const durationMinutes = Number(input.durationMinutes ?? 0);

  if (!ymd || !hm || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Invalid booking range input");
  }

  // Construct from numeric LOCAL parts (no ambiguous parsing).
  // Date(year, monthIndex, day, hour, minute) creates a local-time Date.
  const startLocal = new Date(ymd.year, ymd.month - 1, ymd.day, hm.hour, hm.minute, 0, 0);
  const endLocal = new Date(startLocal.getTime() + durationMinutes * 60 * 1000);

  const startTimeIsoUtc = startLocal.toISOString();
  const endTimeIsoUtc = endLocal.toISOString();

  if (process.env.NODE_ENV !== "production") {
    // Temporary dev logs for debugging cross-device normalization.
    // eslint-disable-next-line no-console
    console.log("[bookingTime] local", {
      date: input.preferredDate,
      start: input.timeSlot,
      durationMinutes,
      utcStart: startTimeIsoUtc,
      utcEnd: endTimeIsoUtc,
    });
  }

  return { startTimeIsoUtc, endTimeIsoUtc };
}

export function buildLocalDayBoundsUtc(preferredDate: string): { dayStartUtcIso: string; dayEndUtcIso: string } {
  const ymd = parseYmd(preferredDate);
  if (!ymd) throw new Error("Invalid preferredDate");
  const startLocal = new Date(ymd.year, ymd.month - 1, ymd.day, 0, 0, 0, 0);
  const endLocal = new Date(ymd.year, ymd.month - 1, ymd.day, 23, 59, 59, 999);
  return { dayStartUtcIso: startLocal.toISOString(), dayEndUtcIso: endLocal.toISOString() };
}

