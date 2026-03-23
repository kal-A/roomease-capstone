"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ROOMS, getBuildingsFromRooms } from "@/data/rooms";
import type { EventFormData, Room } from "@/types/booking";
import {
  formatTimeSlot,
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
  timeRangesOverlap,
  timeToMinutes,
  TIME_SLOTS_30MIN,
} from "@/types/booking";
import { furnitureLabelsFromCodes } from "@/lib/furniture";
import { useBookings, type BookingStatus } from "@/lib/bookingsStore";
import Link from "next/link";
import { ConfirmationPage } from "@/components/ConfirmationPage";
import { EventForm } from "@/components/EventForm";
import { ProgressStepper } from "@/components/ProgressStepper";
import { RoomRecommendation } from "@/components/RoomRecommendation";
import type { TimeBarBooking } from "@/components/TimeBar";
import { buildBookingRange } from "@/lib/bookingTime";
import { DateTime } from "luxon";

const TOTAL_STEPS_FULL = 3;
const TOTAL_STEPS_DIRECT = 2;

function getMatchingRooms(formData: EventFormData): Room[] {
  const {
    groupSize,
    preferredBuilding,
    avNeedsEnabled,
    avNeeds,
    furnitureNeedsEnabled,
    furnitureNeeds,
  } = formData;

  const needsStreaming = avNeedsEnabled && avNeeds.includes("streamingRecording");
  const needsElectronic = avNeedsEnabled && avNeeds.includes("electronicClassroom");
  const needsDocCam = avNeedsEnabled && avNeeds.includes("documentCamera");
  const hasAnyAvNeed = avNeedsEnabled && avNeeds.length > 0 && !avNeeds.includes("none");

  const needsFurniture =
    furnitureNeedsEnabled && Array.isArray(furnitureNeeds) && furnitureNeeds.length > 0;

  const filtered: Room[] = ROOMS.filter((room) => {
    if (room.capacity < groupSize) return false;
    if (preferredBuilding && preferredBuilding.trim() !== "" && room.building !== preferredBuilding) return false;
    if (needsStreaming && !roomIsStreamingRecordingCapable(room)) return false;
    if (needsElectronic && !roomIsElectronicClassroom(room)) return false;
    if (needsDocCam && !roomHasDocumentCamera(room)) return false;
    if (needsFurniture) {
      const labels = furnitureLabelsFromCodes(room.furniture);
      for (const need of furnitureNeeds) {
        if (!labels.includes(need)) return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) return [];

  const score = (room: Room): number => {
    let s = 0;
    const capacityCloseness = room.capacity - groupSize;
    s -= capacityCloseness;
    // No AV scoring unless AV needs were selected
    if (!hasAnyAvNeed) return s;
    if (needsStreaming && roomIsStreamingRecordingCapable(room)) s += 10;
    if (needsElectronic && roomIsElectronicClassroom(room)) s += 8;
    if (needsDocCam && roomHasDocumentCamera(room)) s += 6;
    return s;
  };

  return [...filtered].sort((a, b) => score(b) - score(a));
}

function normalizeBookingStatus(raw: string | null | undefined): BookingStatus | null {
  const v = String(raw ?? "").toLowerCase().trim();
  if (v === "pending") return "pending";
  if (v === "approved") return "approved";
  if (v === "denied") return "denied";
  if (v === "confirmed") return "confirmed";
  if (v === "changes_requested") return "changes_requested";
  return null;
}

function validateRoomForBooking(args: {
  room: Room;
  form: EventFormData;
  existingBookings: { roomId: string; preferredDate: string; timeSlot: string; durationMinutes: number }[];
}): { ok: boolean; errors: string[] } {
  const { room, form, existingBookings } = args;
  const errors: string[] = [];

  if (room.capacity < (form.groupSize ?? 0)) {
    errors.push("This room does not fit your group size.");
  }

  const needsStreaming = (form.avNeedsEnabled ?? false) && (form.avNeeds ?? []).includes("streamingRecording");
  const needsElectronic = (form.avNeedsEnabled ?? false) && (form.avNeeds ?? []).includes("electronicClassroom");
  const needsDocCam = (form.avNeedsEnabled ?? false) && (form.avNeeds ?? []).includes("documentCamera");
  if (needsStreaming && !roomIsStreamingRecordingCapable(room)) errors.push("Streaming & recording is not available in this room.");
  if (needsElectronic && !roomIsElectronicClassroom(room)) errors.push("This room is not an electronic classroom.");
  if (needsDocCam && !roomHasDocumentCamera(room)) errors.push("A document camera is not available in this room.");

  const needsFurniture =
    (form.furnitureNeedsEnabled ?? false) && (form.furnitureNeeds?.length ?? 0) > 0;
  if (needsFurniture) {
    const labels = furnitureLabelsFromCodes(room.furniture);
    for (const need of form.furnitureNeeds ?? []) {
      if (!labels.includes(need)) {
        errors.push(`Furniture requirement not met: ${need}.`);
      }
    }
  }

  const date = form.preferredDate ?? "";
  const timeSlot = form.timeSlot ?? "";
  const duration = form.durationMinutes ?? 60;
  if (date && timeSlot) {
    const startM = timeToMinutes(timeSlot);
    const overlaps = existingBookings.filter((b) => {
      if (b.roomId !== String(room.id)) return false;
      if (b.preferredDate !== date) return false;
      const existingStart = timeToMinutes(b.timeSlot);
      const existingDuration = b.durationMinutes ?? 60;
      return timeRangesOverlap(existingStart, existingDuration, startM, duration);
    });
    if (overlaps.length > 0) {
      const maybeFirst = overlaps[0] as any;
      const organizerName = String(maybeFirst?.organizerName ?? "").toLowerCase();
      const isBlocked = organizerName.includes("blocked");
      errors.push(
        isBlocked
          ? "This room is unavailable because it is blocked by a closure."
          : "This room is already booked for that time."
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

const initialFormData: EventFormData = {
  eventName: "",
  organizerName: "",
  preferredDate: "",
  timeSlot: "",
  groupSize: 0,
  eventType: "",
  durationMinutes: 60,
  avNeedsEnabled: false,
  avNeeds: [],
  furnitureNeedsEnabled: false,
  furnitureNeeds: [],
  preferredBuilding: "",
  priorityLevel: "Medium",
};

const buildingsList = getBuildingsFromRooms(ROOMS);

function minutesToLabel(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function localMinutesFromIso(isoUtc: string): number {
  const dt = DateTime.fromISO(isoUtc).setZone("America/Toronto");
  return dt.hour * 60 + dt.minute;
}

function BookPageContent() {
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get("roomId") ?? "";
  const { bookings, addBooking, setBookingStatus } = useBookings();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EventFormData>(() => ({
    ...initialFormData,
    preferredBuilding: initialFormData.preferredBuilding,
  }));
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBookingStatus, setSelectedBookingStatus] = useState<BookingStatus | null>(null);
  const [doubleBookingError, setDoubleBookingError] = useState<string | null>(null);
  const [doubleBookingErrorContext, setDoubleBookingErrorContext] = useState<{ isMine: boolean; organizerName: string; timeLabel: string } | null>(null);
  const [selectedRoomError, setSelectedRoomError] = useState<string[] | null>(null);
  const [directBookingError, setDirectBookingError] = useState<string | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<{ room: Room; formData: EventFormData } | null>(null);

  const directErrorRef = useRef<HTMLDivElement | null>(null);
  const bookingErrorRef = useRef<HTMLDivElement | null>(null);
  const lastErrorScrollKeyRef = useRef<string>("");
  const [directErrorPulse, setDirectErrorPulse] = useState(0);
  const [bookingErrorPulse, setBookingErrorPulse] = useState(0);

  const scrollToBookingError = (kind: "direct" | "booking", errorMessage: string) => {
    if (typeof window === "undefined") return;
    try {
      document.body.style.overflow = "";
    } catch {
      // ignore
    }

    const ref = kind === "direct" ? directErrorRef : bookingErrorRef;
    const errorKey = `${kind}:${errorMessage.trim()}`;

    // Prevent double scroll/jitter: only scroll for a new error.
    if (lastErrorScrollKeyRef.current === errorKey) return;
    lastErrorScrollKeyRef.current = errorKey;

    if (kind === "direct") setDirectErrorPulse((p) => p + 1);
    if (kind === "booking") setBookingErrorPulse((p) => p + 1);

    // Small delay lets the error mount before we scroll + focus.
    window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      (el as HTMLElement).focus?.();
    }, 75);
  };

  const matchingRooms = useMemo(() => getMatchingRooms(formData), [formData]);
  const lockedRoom = useMemo(() => {
    if (!roomIdFromUrl) return null;
    return ROOMS.find((r) => String(r.id) === String(roomIdFromUrl)) ?? null;
  }, [roomIdFromUrl]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);

  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [showConfirmModal]);

  useEffect(() => {
    if (!directBookingError && !doubleBookingError) {
      lastErrorScrollKeyRef.current = "";
    }
  }, [directBookingError, doubleBookingError]);

  useEffect(() => {
    if (step === 2 && !lockedRoom) {
      setRoomsLoading(true);
      const t = setTimeout(() => setRoomsLoading(false), 400);
      return () => clearTimeout(t);
    }
  }, [step, lockedRoom]);

  const totalSteps = lockedRoom ? TOTAL_STEPS_DIRECT : TOTAL_STEPS_FULL;
  const { data: session } = useSession();
  const [liveRoomBookings, setLiveRoomBookings] = useState<TimeBarBooking[]>([]);
  const [blockedForDate, setBlockedForDate] = useState<
    { roomId: string; preferredDate: string; timeSlot: string; durationMinutes: number; organizerName?: string; organizerEmail?: string }[]
  >([]);
  const existingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "pending" || b.status === "approved" || b.status === "confirmed" || b.status === "changes_requested")
        .map((b) => ({
          roomId: b.roomId,
          preferredDate: b.preferredDate,
          timeSlot: b.timeSlot,
          durationMinutes: b.durationMinutes,
          organizerName: b.organizerName,
          organizerEmail: b.organizerEmail,
        })),
    [bookings]
  );

  const existingBookingsWithBlocked = useMemo(() => {
    if (!formData.preferredDate) return existingBookings;
    return [...existingBookings, ...blockedForDate];
  }, [existingBookings, blockedForDate, formData.preferredDate]);

  // Fetch admin-created blockers for the selected local date.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const date = formData.preferredDate;
      if (!date) {
        setBlockedForDate([]);
        return;
      }

      try {
        const res = await fetch(`/api/blockers/by-date?${new URLSearchParams({ date })}`, { method: "GET" });
        if (!res.ok) return;
        const json = (await res.json().catch(() => ({}))) as { blockedBookings?: unknown[] };
        const list = Array.isArray(json.blockedBookings) ? json.blockedBookings : [];
        if (!cancelled) setBlockedForDate(list as any);
      } catch {
        // Keep booking flow working even if blockers fail to load.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.preferredDate]);

  const directConflictContext = useMemo(() => {
    if (!directBookingError || !lockedRoom) return null;
    const msg = directBookingError.toLowerCase();
    const isTimeConflict = msg.includes("booked") || msg.includes("blocked") || msg.includes("blocker");
    if (!isTimeConflict) return null;
    if (!formData.timeSlot) return null;

    const startM = timeToMinutes(formData.timeSlot);
    const durationM = formData.durationMinutes ?? 60;
    const endM = startM + durationM;

    const overlaps = liveRoomBookings
      .filter((b) => {
        const bStart = localMinutesFromIso(b.startTimeIsoUtc);
        const bEnd = localMinutesFromIso(b.endTimeIsoUtc);
        return timeRangesOverlap(bStart, bEnd - bStart, startM, durationM);
      })
      .sort((a, b) => localMinutesFromIso(a.startTimeIsoUtc) - localMinutesFromIso(b.startTimeIsoUtc));

    const first = overlaps[0];
    if (!first) return null;

    return {
      isMine: Boolean(first.isMine),
      organizerName: first.organizerName ?? "Unknown Organizer",
      isBlocked: String(first.status ?? "").toLowerCase().trim() === "blocked",
      timeLabel: `${minutesToLabel(startM)}–${minutesToLabel(endM)}`,
    };
  }, [directBookingError, lockedRoom, formData.timeSlot, formData.durationMinutes, liveRoomBookings]);

  // If the user picks one of the "closest available options" and the new selection is valid,
  // automatically clear the top-level conflict error (so they aren't blocked by stale UI state).
  useEffect(() => {
    if (!directBookingError || !lockedRoom) return;
    const isTimeConflict = /booked|blocked/i.test(directBookingError);
    if (!isTimeConflict) return;
    if (directConflictContext === null) {
      setDirectBookingError(null);
    }
  }, [directBookingError, directConflictContext, lockedRoom]);

  // Live availability source of truth for direct booking timeline.
  useEffect(() => {
    if (!lockedRoom || !formData.preferredDate) {
      setLiveRoomBookings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          roomId: String(lockedRoom.id),
          date: String(formData.preferredDate),
        });
        const res = await fetch(`/api/bookings/by-room?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const rows = Array.isArray((json as any)?.bookings) ? (json as any).bookings : [];
        const mapped: TimeBarBooking[] = rows.map((b: any) => ({
          roomId: String(b.room_id),
          startTimeIsoUtc: String(b.start_time),
          endTimeIsoUtc: String(b.end_time),
          organizerName: String(b.organizer_name ?? ""),
          bookerName: b.booker_name ?? null,
          bookerEmail: String(b.booker_email ?? ""),
          status: String(b.status ?? ""),
          eventName: b.event_name ?? null,
          isMine: Boolean(b.is_mine),
        }));
        if (!cancelled) setLiveRoomBookings(mapped);
      } catch (e) {
        console.error("LIVE AVAILABILITY FETCH ERROR", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockedRoom, formData.preferredDate]);

  const handleFormSubmit = useCallback(() => {
    setDoubleBookingError(null);
    setDoubleBookingErrorContext(null);
    setSelectedRoomError(null);
    setDirectBookingError(null);
    setSelectedBookingStatus(null);
    setStep(2);
  }, []);

  /** Direct booking: validate, then show confirmation modal. */
  const handleDirectBookingSubmit = useCallback(() => {
    if (!lockedRoom) return;
    setDirectBookingError(null);
    const capacityOk = lockedRoom.capacity >= (formData.groupSize ?? 0);
    if (!capacityOk) {
      const msg = "This room does not fit your group size.";
      setDirectBookingError(msg);
      scrollToBookingError("direct", msg);
      return;
    }
    const overlap = existingBookingsWithBlocked.some((b) => {
      if (b.roomId !== String(lockedRoom.id)) return false;
      if (b.preferredDate !== (formData.preferredDate ?? "")) return false;
      const startM = timeToMinutes(formData.timeSlot ?? "");
      const durationM = formData.durationMinutes ?? 60;
      const existingStart = timeToMinutes(b.timeSlot);
      const existingDuration = b.durationMinutes ?? 60;
      return timeRangesOverlap(existingStart, existingDuration, startM, durationM);
    });
    if (overlap) {
      const msg = "This room is already booked or blocked for that time.";
      setDirectBookingError(msg);
      scrollToBookingError("direct", msg);
      return;
    }
    setPendingBooking({ room: lockedRoom, formData });
    setShowConfirmModal(true);
  }, [lockedRoom, formData, existingBookingsWithBlocked]);

  const handleSelectRoom = useCallback(
    (room: Room) => {
      const validation = validateRoomForBooking({ room, form: formData, existingBookings: existingBookingsWithBlocked });
      if (!validation.ok) {
        const msg = validation.errors[0] ?? "This room cannot be booked with the selected constraints.";
        setDoubleBookingError(msg);

        const isTimeConflict = /booked|blocked|blocker/i.test(msg);
        if (isTimeConflict && formData.preferredDate && formData.timeSlot) {
          const startM = timeToMinutes(formData.timeSlot);
          const durationM = formData.durationMinutes ?? 60;
          const endM = startM + durationM;

          const overlaps = existingBookingsWithBlocked
            .filter((b) => {
              if (b.roomId !== String(room.id)) return false;
              if (b.preferredDate !== formData.preferredDate) return false;
              const existingStart = timeToMinutes(b.timeSlot);
              const existingDuration = b.durationMinutes ?? 60;
              return timeRangesOverlap(existingStart, existingDuration, startM, durationM);
            })
            .sort((a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot));

          const first = overlaps[0];
          if (first) {
            const isMine = Boolean(session?.user?.email) && String(first.organizerEmail ?? "") === String(session?.user?.email);
            setDoubleBookingErrorContext({
              isMine,
              organizerName: String(first.organizerName ?? "Unknown Organizer"),
              timeLabel: `${minutesToLabel(startM)}–${minutesToLabel(endM)}`,
            });
          } else {
            setDoubleBookingErrorContext(null);
          }
        } else {
          setDoubleBookingErrorContext(null);
        }
        return;
      }
      setPendingBooking({ room, formData });
      setShowConfirmModal(true);
    },
    [formData, existingBookingsWithBlocked, session?.user?.email]
  );

  const handleConfirmBooking = useCallback(async () => {
    if (!pendingBooking) return;
    let createdBookingResponse: { booking?: { id?: string; status?: string } } | null = null;
    try {
      const { startTimeIsoUtc, endTimeIsoUtc } = buildBookingRange({
        preferredDate: pendingBooking.formData.preferredDate ?? "",
        timeSlot: pendingBooking.formData.timeSlot ?? "",
        durationMinutes: pendingBooking.formData.durationMinutes ?? 60,
      });

      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: String(pendingBooking.room.id),
          eventName: String(pendingBooking.formData.eventName ?? ""),
          organizerName: String(pendingBooking.formData.organizerName ?? ""),
          groupSize: Number(pendingBooking.formData.groupSize ?? 0),
          startTime: startTimeIsoUtc,
          endTime: endTimeIsoUtc,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg = String((json as any)?.error ?? "Booking failed.");
        const isDirect = !!lockedRoom && String(pendingBooking.room.id) === String(lockedRoom.id);
        if (isDirect) {
          const finalMsg = res.status === 400 ? msg : "Something went wrong creating your booking. Please try again.";
          setDirectBookingError(finalMsg);
          scrollToBookingError("direct", finalMsg);
        } else {
          const finalMsg = res.status === 400 ? msg : "Something went wrong creating your booking. Please try again.";
          setDoubleBookingError(finalMsg);

          const isTimeConflict = /booked|blocked|blocker/i.test(finalMsg);
          if (isTimeConflict && pendingBooking.formData.preferredDate && pendingBooking.formData.timeSlot) {
            const startM = timeToMinutes(pendingBooking.formData.timeSlot);
            const durationM = pendingBooking.formData.durationMinutes ?? 60;
            const endM = startM + durationM;

            const overlaps = existingBookingsWithBlocked
              .filter((b) => {
                if (b.roomId !== String(pendingBooking.room.id)) return false;
                if (b.preferredDate !== pendingBooking.formData.preferredDate) return false;
                const existingStart = timeToMinutes(b.timeSlot);
                const existingDuration = b.durationMinutes ?? 60;
                return timeRangesOverlap(existingStart, existingDuration, startM, durationM);
              })
              .sort((a, b) => timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot));

            const first = overlaps[0];
            if (first) {
              const isMine = Boolean(session?.user?.email) && String(first.organizerEmail ?? "") === String(session?.user?.email);
              setDoubleBookingErrorContext({
                isMine,
                organizerName: String(first.organizerName ?? "Unknown Organizer"),
                timeLabel: `${minutesToLabel(startM)}–${minutesToLabel(endM)}`,
              });
            } else {
              setDoubleBookingErrorContext(null);
            }
          } else {
            setDoubleBookingErrorContext(null);
          }

          scrollToBookingError("booking", finalMsg);
        }
        setShowConfirmModal(false);
        setPendingBooking(null);
        return;
      }

      createdBookingResponse = (await res.json().catch(() => null)) as { booking?: { id?: string; status?: string } } | null;
    } catch (e) {
      console.error("BOOKING CREATE API ERROR", e);
      const isDirect = !!lockedRoom && String(pendingBooking.room.id) === String(lockedRoom.id);
      if (isDirect) {
        const finalMsg = "Something went wrong creating your booking. Please try again.";
        setDirectBookingError(finalMsg);
        scrollToBookingError("direct", finalMsg);
      } else {
        const finalMsg = "Something went wrong creating your booking. Please try again.";
        setDoubleBookingError(finalMsg);
        setDoubleBookingErrorContext(null);
        scrollToBookingError("booking", finalMsg);
      }
      setShowConfirmModal(false);
      setPendingBooking(null);
      return;
    }

    const backendBookingId = createdBookingResponse?.booking?.id ? String(createdBookingResponse.booking.id) : undefined;
    const booking = addBooking({
      form: pendingBooking.formData,
      room: pendingBooking.room,
      organizerEmail: session?.user?.email ?? undefined,
      backendBookingId,
    });

    // Use returned backend status (source of truth) for confirmation UI + My Bookings labels.
    const serverStatusRaw = String(createdBookingResponse?.booking?.status ?? "");
    const serverStatus = normalizeBookingStatus(serverStatusRaw) ?? booking.status;
    setBookingStatus(booking.id, serverStatus);

    setSelectedBookingStatus(serverStatus);
    setConfirmationNumber(booking.confirmationNumber);
    setSelectedRoom(pendingBooking.room);
    setDoubleBookingError(null);
    setDoubleBookingErrorContext(null);
    setDirectBookingError(null);
    setShowConfirmModal(false);
    setPendingBooking(null);
    setStep(3);

    // Refresh live availability immediately after a successful booking.
    if (lockedRoom && pendingBooking.formData.preferredDate) {
      try {
        const params = new URLSearchParams({
          roomId: String(lockedRoom.id),
          date: String(pendingBooking.formData.preferredDate),
        });
        const res = await fetch(`/api/bookings/by-room?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          const rows = Array.isArray((json as any)?.bookings) ? (json as any).bookings : [];
          const mapped: TimeBarBooking[] = rows.map((b: any) => ({
            roomId: String(b.room_id),
            startTimeIsoUtc: String(b.start_time),
            endTimeIsoUtc: String(b.end_time),
            organizerName: String(b.organizer_name ?? ""),
            bookerName: b.booker_name ?? null,
            bookerEmail: String(b.booker_email ?? ""),
            status: String(b.status ?? ""),
            eventName: b.event_name ?? null,
            isMine: Boolean(b.is_mine),
          }));
          setLiveRoomBookings(mapped);
        }
      } catch {
        // ignore
      }
    }
  }, [pendingBooking, addBooking, session?.user?.email, setBookingStatus]);

  const handleBack = useCallback(() => {
    setDoubleBookingError(null);
    setDoubleBookingErrorContext(null);
    setSelectedRoomError(null);
    setDirectBookingError(null);
    setSelectedBookingStatus(null);
    setStep(1);
  }, []);

  const handleBookAnother = useCallback(() => {
    setFormData(initialFormData);
    setSelectedRoom(null);
    setConfirmationNumber("");
    setDirectBookingError(null);
    setDoubleBookingErrorContext(null);
    setSelectedBookingStatus(null);
    setStep(1);
  }, []);

  const confirmLockedRoom = useCallback(async () => {
    if (!lockedRoom) return;
    const validation = validateRoomForBooking({ room: lockedRoom, form: formData, existingBookings: existingBookingsWithBlocked });
    if (!validation.ok) {
      setSelectedRoomError(validation.errors);
      return;
    }
    setSelectedRoom(lockedRoom);
    let createdBookingResponse: { booking?: { id?: string; status?: string } } | null = null;
    try {
      const { startTimeIsoUtc, endTimeIsoUtc } = buildBookingRange({
        preferredDate: formData.preferredDate ?? "",
        timeSlot: formData.timeSlot ?? "",
        durationMinutes: formData.durationMinutes ?? 60,
      });

      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: String(lockedRoom.id),
          eventName: String(formData.eventName ?? ""),
          organizerName: String(formData.organizerName ?? ""),
          groupSize: Number(formData.groupSize ?? 0),
          startTime: startTimeIsoUtc,
          endTime: endTimeIsoUtc,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg = String((json as any)?.error ?? "Booking failed.");
        setSelectedRoomError([msg]);
        setSelectedRoom(null);
        return;
      }

      createdBookingResponse = (await res.json().catch(() => null)) as { booking?: { id?: string; status?: string } } | null;
    } catch (e) {
      console.error("BOOKING CREATE API ERROR", e);
      setSelectedRoomError(["Something went wrong creating your booking. Please try again."]);
      setSelectedRoom(null);
      return;
    }

    const backendBookingId = createdBookingResponse?.booking?.id ? String(createdBookingResponse.booking.id) : undefined;
    const booking = addBooking({
      form: formData,
      room: lockedRoom,
      organizerEmail: session?.user?.email ?? undefined,
      backendBookingId,
    });

    const serverStatusRaw = String(createdBookingResponse?.booking?.status ?? "");
    const serverStatus = normalizeBookingStatus(serverStatusRaw) ?? booking.status;
    setBookingStatus(booking.id, serverStatus);
    setSelectedBookingStatus(serverStatus);

    setConfirmationNumber(booking.confirmationNumber);
    setSelectedRoomError(null);
    setStep(3);
  }, [lockedRoom, formData, existingBookingsWithBlocked, addBooking, session?.user?.email, setBookingStatus]);

  const smartHints = useMemo(() => {
    const date = formData.preferredDate ?? "";
    const timeSlot = formData.timeSlot ?? "";
    const duration = formData.durationMinutes ?? 60;
    const organizer = String(formData.organizerName ?? "").trim();
    const hasCoreSelection = Boolean(date && timeSlot);
    const selectedStart = hasCoreSelection ? timeToMinutes(timeSlot) : 0;

    const isAvailableForRoom = (roomId: string, startM: number): boolean =>
      !existingBookingsWithBlocked.some((b) => {
        if (String(b.roomId) !== String(roomId)) return false;
        if (String(b.preferredDate) !== date) return false;
        const s = timeToMinutes(String(b.timeSlot));
        const d = Number(b.durationMinutes ?? 60);
        return timeRangesOverlap(s, d, startM, duration);
      });

    const selectedRoomForHints = lockedRoom ?? null;
    const slotAvailable =
      selectedRoomForHints && hasCoreSelection
        ? isAvailableForRoom(String(selectedRoomForHints.id), selectedStart)
        : null;

    const closestTimes: { start: string; end: string }[] = [];
    if (selectedRoomForHints && hasCoreSelection && slotAvailable === false) {
      const ranked = TIME_SLOTS_30MIN.map((s) => s.value)
        .filter((slot) => {
          const m = timeToMinutes(slot);
          return m >= 9 * 60 && m + duration <= 22 * 60;
        })
        .filter((slot) => isAvailableForRoom(String(selectedRoomForHints.id), timeToMinutes(slot)))
        .map((slot) => {
          const m = timeToMinutes(slot);
          return { m, distance: Math.abs(m - selectedStart) };
        })
        .sort((a, b) => a.distance - b.distance || a.m - b.m)
        .slice(0, 3);

      for (const x of ranked) {
        closestTimes.push({ start: minutesToLabel(x.m), end: minutesToLabel(x.m + duration) });
      }
    }

    let similarRooms: Room[] = [];
    if (selectedRoomForHints && hasCoreSelection && slotAvailable === false) {
      similarRooms = ROOMS
        .filter((r) => String(r.id) !== String(selectedRoomForHints.id))
        .filter(
          (r) => r.building === selectedRoomForHints.building || Math.abs(r.capacity - selectedRoomForHints.capacity) <= 20
        )
        .filter((r) => isAvailableForRoom(String(r.id), selectedStart))
        .sort((a, b) => {
          const aSameBuilding = a.building === selectedRoomForHints.building ? 0 : 1;
          const bSameBuilding = b.building === selectedRoomForHints.building ? 0 : 1;
          if (aSameBuilding !== bSameBuilding) return aSameBuilding - bSameBuilding;
          return Math.abs(a.capacity - selectedRoomForHints.capacity) - Math.abs(b.capacity - selectedRoomForHints.capacity);
        })
        .slice(0, 3);
    }

    const byOrganizerRoom = new Map<string, number>();
    if (organizer) {
      for (const b of bookings) {
        if (String(b.organizerName ?? "").trim().toLowerCase() !== organizer.toLowerCase()) continue;
        byOrganizerRoom.set(String(b.roomId), (byOrganizerRoom.get(String(b.roomId)) ?? 0) + 1);
      }
    }
    const clubFrequentRoomId = [...byOrganizerRoom.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const hourLoad = new Map<number, number>();
    for (const b of bookings) {
      const hour = Number(String(b.timeSlot ?? "00:00").split(":")[0] ?? "0");
      hourLoad.set(hour, (hourLoad.get(hour) ?? 0) + 1);
    }
    const selectedHour = hasCoreSelection ? Math.floor(selectedStart / 60) : -1;
    const isHighDemand = selectedHour >= 0 && (hourLoad.get(selectedHour) ?? 0) >= 3;

    return { hasCoreSelection, slotAvailable, closestTimes, similarRooms, clubFrequentRoomId, isHighDemand };
  }, [formData.preferredDate, formData.timeSlot, formData.durationMinutes, formData.organizerName, existingBookingsWithBlocked, lockedRoom, bookings]);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6 sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-2xl">
        <ProgressStepper currentStep={step} totalSteps={totalSteps} />

        <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-xl sm:p-10"
          >
            <h2 className="mb-8 text-2xl font-semibold tracking-tight text-[var(--text)]">
              {lockedRoom ? "Book This Room" : "Event Information"}
            </h2>
            {lockedRoom && (
              <div className="mb-8 rounded-2xl border border-[var(--primary)]/40 bg-[var(--surface)] backdrop-blur-md p-5" style={{ borderRadius: "var(--radiusLg)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Selected Room</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--text)]">{lockedRoom.name}</p>
                    <p className="mt-1 text-sm text-[var(--textSecondary)]">Capacity {lockedRoom.capacity}</p>
                  </div>
                  <Link
                    href="/rooms"
                    className="rounded-full border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                  >
                    Change room
                  </Link>
                </div>
              </div>
            )}
            <AnimatePresence>
              {directBookingError && (
                <motion.div
                  key={`direct-error-${directErrorPulse}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0, x: [0, -2, 2, -2, 0] }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.22 }}
                  id="direct-booking-error"
                  tabIndex={-1}
                  ref={directErrorRef}
                  className="mb-6 scroll-mt-24 rounded-lg border border-[var(--danger)]/60 bg-[var(--dangerBg)] shadow-[var(--shadowLg)] p-4"
                  style={{ borderRadius: "var(--radiusLg)" }}
                  role="alert"
                >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--danger)]/15 border border-[var(--danger)]/30">
                    <svg className="h-5 w-5 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-7.2 12.49A2 2 0 0 0 4.82 19h14.36a2 2 0 0 0 1.73-2.65l-7.2-12.49a2 2 0 0 0-3.46 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[var(--text)]">
                      {directConflictContext
                        ? directConflictContext.isBlocked
                          ? "Room unavailable"
                          : "Time slot unavailable"
                        : directBookingError?.includes("not yet configured in the booking system")
                          ? directBookingError
                          : "Booking couldn’t be confirmed"}
                    </div>
                    {directConflictContext ? (
                      <>
                        <div className="mt-0.5 text-xs font-medium text-[var(--textSecondary)]">
                          {directConflictContext.isBlocked
                            ? "This room is unavailable due to a blocker or closure."
                            : directConflictContext.isMine
                              ? "You already have this room booked for that time."
                              : "This room is already booked for that time."}
                        </div>
                        <div className="mt-2 text-xs text-[var(--textSecondary)]">Try a different time or choose one of the options below.</div>
                        <div className="mt-2 text-[10px] font-medium text-[var(--textMuted)]">
                          {directConflictContext.isBlocked
                            ? `${directConflictContext.organizerName} · ${directConflictContext.timeLabel}`
                            : directConflictContext.isMine
                              ? `Your booking · ${directConflictContext.timeLabel}`
                              : `Booked by ${directConflictContext.organizerName} · ${directConflictContext.timeLabel}`}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-1 text-xs font-medium text-[var(--textSecondary)]">{directBookingError}</div>
                        <div className="mt-2 text-xs text-[var(--textSecondary)]">Review the details and try again.</div>
                      </>
                    )}
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className={directBookingError ? "opacity-95 transition-opacity duration-200" : ""}>
              <EventForm
                data={formData}
                onChange={setFormData}
                onSubmit={lockedRoom ? handleDirectBookingSubmit : handleFormSubmit}
                buildings={buildingsList}
                directBooking={!!lockedRoom}
                roomId={lockedRoom?.id}
                existingBookings={lockedRoom ? liveRoomBookings : []}
                viewerEmail={session?.user?.email ?? null}
              />
            </div>
            {(lockedRoom || (formData.organizerName ?? "").trim()) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Smart Recommendations</p>
                <div className="mt-2 space-y-2 text-sm">
                  {lockedRoom && smartHints.hasCoreSelection && smartHints.slotAvailable === true && (
                    <p className="text-[var(--success)]">This time slot is available.</p>
                  )}
                  {lockedRoom && smartHints.hasCoreSelection && smartHints.slotAvailable === false && (
                    <>
                      <p className="text-[var(--danger)]">This time conflicts with an existing booking.</p>
                      {smartHints.closestTimes.length > 0 && (
                        <p className="text-[var(--textSecondary)]">
                          Closest available times:{" "}
                          <span className="text-[var(--text)]">
                            {smartHints.closestTimes.map((t) => `${t.start}-${t.end}`).join(" • ")}
                          </span>
                        </p>
                      )}
                      {smartHints.similarRooms.length > 0 && (
                        <p className="text-[var(--textSecondary)]">
                          Similar available rooms:{" "}
                          <span className="text-[var(--text)]">
                            {smartHints.similarRooms.map((r) => String(r.id)).join(", ")}
                          </span>
                        </p>
                      )}
                    </>
                  )}
                  {smartHints.clubFrequentRoomId && (
                    <p className="text-[var(--textSecondary)]">
                      This club often books: <span className="font-medium text-[var(--text)]">{smartHints.clubFrequentRoomId}</span>
                    </p>
                  )}
                  {smartHints.isHighDemand && (
                    <p className="text-[var(--primary)]">
                      This is a high-demand time slot. Consider booking earlier for better availability.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 2 && !lockedRoom && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--foreground)]">Room Results</h2>
            {roomsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                  >
                    <div className="p-5">
                      <div className="h-6 w-48 rounded-xl bg-[var(--border)]" />
                      <div className="mt-3 h-4 w-32 rounded-xl bg-[var(--border)]" />
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 w-24 rounded-full bg-[var(--border)]" />
                        <div className="h-8 w-28 rounded-full bg-[var(--border)]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className={doubleBookingError ? "opacity-95 transition-opacity duration-200" : ""}>
              <RoomRecommendation
                formData={formData}
                matchingRooms={matchingRooms}
                onSelectRoom={handleSelectRoom}
                onBack={handleBack}
                doubleBookingError={doubleBookingError}
                bookingErrorRef={bookingErrorRef}
                errorPulseKey={bookingErrorPulse}
                bookingConflictContext={doubleBookingErrorContext}
              />
            </div>
            )}
          </motion.div>
        )}

        {(step === 3 || (lockedRoom && step === 2)) && selectedRoom && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-0"
          >
            <ConfirmationPage
              formData={formData}
              room={selectedRoom}
              confirmationNumber={confirmationNumber}
              onBookAnother={handleBookAnother}
              bookedByName={session?.user?.name ?? session?.user?.email ?? null}
              bookingStatus={selectedBookingStatus}
            />
          </motion.div>
        )}
        </AnimatePresence>

        {showConfirmModal && pendingBooking && (() => {
          const startM = timeToMinutes(pendingBooking.formData.timeSlot ?? "");
          const durationM = pendingBooking.formData.durationMinutes ?? 60;
          const endM = startM + durationM;
          const endH = Math.floor(endM / 60);
          const endMin = endM % 60;
          const endPeriod = endH >= 12 ? "PM" : "AM";
          const endH12 = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
          const timeRangeLabel = `${formatTimeSlot(pendingBooking.formData.timeSlot ?? "")} – ${endH12}:${String(endMin).padStart(2, "0")} ${endPeriod}`;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowConfirmModal(false); setPendingBooking(null); }} aria-hidden />
              <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] p-5 shadow-[var(--shadowXl)] max-h-[90vh] flex flex-col">
                <h3 className="text-base font-semibold text-[var(--text)]">Confirm booking</h3>
                <p className="mt-1.5 text-sm text-[var(--textSecondary)]">Are you sure you want to book this room?</p>
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-1 text-sm">
                  <p><span className="text-[var(--textMuted)]">Room:</span> <span className="font-medium text-[var(--text)]">{pendingBooking.room.name}</span></p>
                  <p><span className="text-[var(--textMuted)]">Date:</span> <span className="text-[var(--text)]">{pendingBooking.formData.preferredDate}</span></p>
                  <p><span className="text-[var(--textMuted)]">Time:</span> <span className="text-[var(--text)] font-medium">{timeRangeLabel}</span></p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => { setShowConfirmModal(false); setPendingBooking(null); }} className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--textSecondary)] hover:bg-[var(--borderDivider)]">Cancel</button>
                  <button type="button" onClick={handleConfirmBooking} className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] shadow-sm hover:shadow-md" style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}>Confirm</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
          <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8">
            <div className="h-8 w-48 rounded-xl bg-[var(--border)]" />
            <div className="mt-6 h-64 rounded-xl bg-[var(--border)]" />
          </div>
        </div>
      }
    >
      <BookPageContent />
    </Suspense>
  );
}
