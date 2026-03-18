"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { useBookings } from "@/lib/bookingsStore";
import { getBlockedAsBookings } from "@/lib/blockingStore";
import Link from "next/link";
import { ConfirmationPage } from "@/components/ConfirmationPage";
import { EventForm } from "@/components/EventForm";
import { ProgressStepper } from "@/components/ProgressStepper";
import { RoomRecommendation } from "@/components/RoomRecommendation";
import type { TimeBarBooking } from "@/components/TimeBar";
import { buildBookingRange } from "@/lib/bookingTime";

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
    const overlap = existingBookings.some((b) => {
      if (b.roomId !== String(room.id)) return false;
      if (b.preferredDate !== date) return false;
      const existingStart = timeToMinutes(b.timeSlot);
      const existingDuration = b.durationMinutes ?? 60;
      return timeRangesOverlap(existingStart, existingDuration, startM, duration);
    });
    if (overlap) errors.push("This room is already booked for that time.");
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

function BookPageContent() {
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get("roomId") ?? "";
  const { bookings, addBooking } = useBookings();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EventFormData>(() => ({
    ...initialFormData,
    preferredBuilding: initialFormData.preferredBuilding,
  }));
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [doubleBookingError, setDoubleBookingError] = useState<string | null>(null);
  const [selectedRoomError, setSelectedRoomError] = useState<string[] | null>(null);
  const [directBookingError, setDirectBookingError] = useState<string | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<{ room: Room; formData: EventFormData } | null>(null);

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
    if (step === 2 && !lockedRoom) {
      setRoomsLoading(true);
      const t = setTimeout(() => setRoomsLoading(false), 400);
      return () => clearTimeout(t);
    }
  }, [step, lockedRoom]);

  const totalSteps = lockedRoom ? TOTAL_STEPS_DIRECT : TOTAL_STEPS_FULL;
  const { data: session } = useSession();
  const [liveRoomBookings, setLiveRoomBookings] = useState<TimeBarBooking[]>([]);
  const existingBookings = useMemo(
    () =>
      bookings.map((b) => ({
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
    if (!lockedRoom || !formData.preferredDate) return existingBookings;
    const blocked = getBlockedAsBookings(lockedRoom.id, formData.preferredDate, lockedRoom.building);
    return [...existingBookings, ...blocked];
  }, [existingBookings, lockedRoom, formData.preferredDate]);

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
    setSelectedRoomError(null);
    setDirectBookingError(null);
    setStep(2);
  }, []);

  /** Direct booking: validate, then show confirmation modal. */
  const handleDirectBookingSubmit = useCallback(() => {
    if (!lockedRoom) return;
    setDirectBookingError(null);
    const capacityOk = lockedRoom.capacity >= (formData.groupSize ?? 0);
    if (!capacityOk) {
      setDirectBookingError("This room does not fit your group size.");
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
      setDirectBookingError("This room is already booked or blocked for that time.");
      return;
    }
    setPendingBooking({ room: lockedRoom, formData });
    setShowConfirmModal(true);
  }, [lockedRoom, formData, existingBookingsWithBlocked]);

  const handleSelectRoom = useCallback(
    (room: Room) => {
      const validation = validateRoomForBooking({ room, form: formData, existingBookings: existingBookingsWithBlocked });
      if (!validation.ok) {
        setDoubleBookingError(validation.errors[0] ?? "This room cannot be booked with the selected constraints.");
        return;
      }
      setPendingBooking({ room, formData });
      setShowConfirmModal(true);
    },
    [formData, existingBookingsWithBlocked]
  );

  const handleConfirmBooking = useCallback(async () => {
    if (!pendingBooking) return;
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
          setDirectBookingError(res.status === 400 ? msg : "Something went wrong creating your booking. Please try again.");
        } else {
          setDoubleBookingError(res.status === 400 ? msg : "Something went wrong creating your booking. Please try again.");
        }
        setShowConfirmModal(false);
        setPendingBooking(null);
        return;
      }
    } catch (e) {
      console.error("BOOKING CREATE API ERROR", e);
      const isDirect = !!lockedRoom && String(pendingBooking.room.id) === String(lockedRoom.id);
      if (isDirect) setDirectBookingError("Something went wrong creating your booking. Please try again.");
      else setDoubleBookingError("Something went wrong creating your booking. Please try again.");
      setShowConfirmModal(false);
      setPendingBooking(null);
      return;
    }

    const booking = addBooking({
      form: pendingBooking.formData,
      room: pendingBooking.room,
      organizerEmail: session?.user?.email ?? undefined,
    });
    setConfirmationNumber(booking.confirmationNumber);
    setSelectedRoom(pendingBooking.room);
    setDoubleBookingError(null);
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
  }, [pendingBooking, addBooking, session?.user?.email]);

  const handleBack = useCallback(() => {
    setDoubleBookingError(null);
    setSelectedRoomError(null);
    setDirectBookingError(null);
    setStep(1);
  }, []);

  const handleBookAnother = useCallback(() => {
    setFormData(initialFormData);
    setSelectedRoom(null);
    setConfirmationNumber("");
    setDirectBookingError(null);
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
    } catch (e) {
      console.error("BOOKING CREATE API ERROR", e);
      setSelectedRoomError(["Something went wrong creating your booking. Please try again."]);
      setSelectedRoom(null);
      return;
    }

    const booking = addBooking({
      form: formData,
      room: lockedRoom,
      organizerEmail: session?.user?.email ?? undefined,
    });
    setConfirmationNumber(booking.confirmationNumber);
    setSelectedRoomError(null);
    setStep(3);
  }, [lockedRoom, formData, existingBookingsWithBlocked, addBooking, session?.user?.email]);

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
            {directBookingError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-xl border border-[var(--danger)]/50 bg-[var(--dangerBg)] p-4"
                style={{ borderRadius: "var(--radiusLg)" }}
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  <svg className="h-5 w-5 shrink-0 text-[var(--danger)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-semibold text-[var(--danger)] leading-relaxed">{directBookingError}</p>
                </div>
              </motion.div>
            )}
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
            <RoomRecommendation
              formData={formData}
              matchingRooms={matchingRooms}
              onSelectRoom={handleSelectRoom}
              onBack={handleBack}
              doubleBookingError={doubleBookingError}
            />
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
