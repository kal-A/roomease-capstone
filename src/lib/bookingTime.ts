import { DateTime } from "luxon";

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

  // Interpret the selection in the campus timezone (America/Toronto).
  const base = DateTime.fromObject(
    {
      year: ymd.year,
      month: ymd.month,
      day: ymd.day,
      hour: hm.hour,
      minute: hm.minute,
      second: 0,
      millisecond: 0,
    },
    { zone: "America/Toronto" }
  );

  const startUtc = base.toUTC();
  const endUtc = base.plus({ minutes: durationMinutes }).toUTC();

  const startTimeIsoUtc = startUtc.toISO() ?? startUtc.toUTC().toISO() ?? "";
  const endTimeIsoUtc = endUtc.toISO() ?? endUtc.toUTC().toISO() ?? "";

  if (process.env.NODE_ENV !== "production") {
    // Temporary dev logs for debugging cross-device normalization.
    // eslint-disable-next-line no-console
    console.log("[bookingTime] toronto-range", {
      date: input.preferredDate,
      start: input.timeSlot,
      durationMinutes,
      torontoStart: base.toISO(),
      torontoEnd: base.plus({ minutes: durationMinutes }).toISO(),
      utcStart: startTimeIsoUtc,
      utcEnd: endTimeIsoUtc,
    });
  }

  return { startTimeIsoUtc, endTimeIsoUtc };
}

export function buildLocalDayBoundsUtc(preferredDate: string): { dayStartUtcIso: string; dayEndUtcIso: string } {
  const ymd = parseYmd(preferredDate);
  if (!ymd) throw new Error("Invalid preferredDate");

  const start = DateTime.fromObject(
    { year: ymd.year, month: ymd.month, day: ymd.day, hour: 0, minute: 0, second: 0, millisecond: 0 },
    { zone: "America/Toronto" }
  ).toUTC();
  const end = DateTime.fromObject(
    { year: ymd.year, month: ymd.month, day: ymd.day, hour: 23, minute: 59, second: 59, millisecond: 999 },
    { zone: "America/Toronto" }
  ).toUTC();

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[bookingTime] toronto-day-bounds", {
      date: preferredDate,
      torontoStart: start.setZone("America/Toronto").toISO(),
      torontoEnd: end.setZone("America/Toronto").toISO(),
      utcStart: start.toISO(),
      utcEnd: end.toISO(),
    });
  }

  const dayStartUtcIso = start.toISO() ?? start.toUTC().toISO() ?? "";
  const dayEndUtcIso = end.toISO() ?? end.toUTC().toISO() ?? "";

  return { dayStartUtcIso, dayEndUtcIso };
}

