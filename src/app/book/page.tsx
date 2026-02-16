"use client";

import { useSearchParams } from "next/navigation";
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
import Link from "next/link";
import { ConfirmationPage } from "@/components/ConfirmationPage";
import { EventForm } from "@/components/EventForm";
import { ProgressStepper } from "@/components/ProgressStepper";
import { RoomRecommendation } from "@/components/RoomRecommendation";

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
  const existingBookings = useMemo(
    () =>
      bookings.map((b) => ({
        roomId: b.roomId,
        preferredDate: b.preferredDate,
        timeSlot: b.timeSlot,
        durationMinutes: b.durationMinutes,
      })),
    [bookings]
  );

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
    const overlap = existingBookings.some((b) => {
      if (b.roomId !== String(lockedRoom.id)) return false;
      if (b.preferredDate !== (formData.preferredDate ?? "")) return false;
      const startM = timeToMinutes(formData.timeSlot ?? "");
      const durationM = formData.durationMinutes ?? 60;
      const existingStart = timeToMinutes(b.timeSlot);
      const existingDuration = b.durationMinutes ?? 60;
      return timeRangesOverlap(existingStart, existingDuration, startM, durationM);
    });
    if (overlap) {
      setDirectBookingError("This room is already booked for that time.");
      return;
    }
    setPendingBooking({ room: lockedRoom, formData });
    setShowConfirmModal(true);
  }, [lockedRoom, formData, existingBookings]);

  const handleSelectRoom = useCallback(
    (room: Room) => {
      const validation = validateRoomForBooking({ room, form: formData, existingBookings });
      if (!validation.ok) {
        setDoubleBookingError(validation.errors[0] ?? "This room cannot be booked with the selected constraints.");
        return;
      }
      setPendingBooking({ room, formData });
      setShowConfirmModal(true);
    },
    [formData, existingBookings]
  );

  const handleConfirmBooking = useCallback(() => {
    if (!pendingBooking) return;
    const booking = addBooking({ form: pendingBooking.formData, room: pendingBooking.room });
    setConfirmationNumber(booking.confirmationNumber);
    setSelectedRoom(pendingBooking.room);
    setDoubleBookingError(null);
    setShowConfirmModal(false);
    setPendingBooking(null);
    setStep(3);
  }, [pendingBooking, addBooking]);

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

  const confirmLockedRoom = useCallback(() => {
    if (!lockedRoom) return;
    const validation = validateRoomForBooking({ room: lockedRoom, form: formData, existingBookings });
    if (!validation.ok) {
      setSelectedRoomError(validation.errors);
      return;
    }
    setSelectedRoom(lockedRoom);
    const booking = addBooking({ form: formData, room: lockedRoom });
    setConfirmationNumber(booking.confirmationNumber);
    setSelectedRoomError(null);
    setStep(3);
  }, [lockedRoom, formData, existingBookings, addBooking]);

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
              <div className="mb-8 rounded-2xl border border-[#FFD54A]/40 bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#FFD54A]">Selected Room</p>
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
              <div
                className="mb-8 rounded-2xl border-2 border-[#FFD54A]/60 bg-[#FFD54A]/10 p-5"
                role="alert"
              >
                <p className="text-sm font-semibold text-[#FFD54A]">{directBookingError}</p>
              </div>
            )}
            <EventForm
              data={formData}
              onChange={setFormData}
              onSubmit={lockedRoom ? handleDirectBookingSubmit : handleFormSubmit}
              buildings={buildingsList}
              directBooking={!!lockedRoom}
            />
            {lockedRoom && formData.preferredDate && formData.timeSlot && (() => {
              const date = formData.preferredDate ?? "";
              const startM = timeToMinutes(formData.timeSlot ?? "");
              const durationM = formData.durationMinutes ?? 60;
              const roomBookings = existingBookings.filter((b) => b.roomId === String(lockedRoom.id) && b.preferredDate === date);
              const overlap = roomBookings.some((b) => {
                const existingStart = timeToMinutes(b.timeSlot);
                const existingDuration = b.durationMinutes ?? 60;
                return timeRangesOverlap(existingStart, existingDuration, startM, durationM);
              });
              const nextAvailable: string[] = [];
              if (overlap) {
                for (const slot of TIME_SLOTS_30MIN) {
                  const slotStart = timeToMinutes(slot.value);
                  const conflict = roomBookings.some((b) => {
                    const existingStart = timeToMinutes(b.timeSlot);
                    const existingDuration = b.durationMinutes ?? 60;
                    return timeRangesOverlap(existingStart, existingDuration, slotStart, durationM);
                  });
                  if (!conflict && nextAvailable.length < 3) nextAvailable.push(slot.label);
                }
              }
              return (
                <div className="mt-4 rounded-xl border border-[var(--borderDivider)] bg-[var(--surface)] p-4">
                  <p className="text-sm font-medium text-[var(--textSecondary)] mb-1">Availability for this room</p>
                  {overlap ? (
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-500/30">Not available for this date & time</span>
                      {nextAvailable.length > 0 && (
                        <p className="mt-2 text-xs text-[var(--textMuted)]">Next available: {nextAvailable.slice(0, 3).join(", ")}</p>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-600 border border-emerald-500/30">Available</span>
                  )}
                </div>
              );
            })()}
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
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg sm:p-8"
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
                  <button type="button" onClick={handleConfirmBooking} className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-black hover:bg-[var(--primaryHover)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]">Confirm</button>
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
