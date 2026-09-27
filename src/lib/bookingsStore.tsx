"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { EventFormData, Room } from "@/types/booking";
import { formatDuration, formatTimeSlot } from "@/types/booking";
import { formatFurniture } from "@/lib/furniture";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";
import {
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
} from "@/types/booking";

export type BookingStatus = "pending" | "approved" | "denied" | "confirmed" | "changes_requested";

export interface Booking {
  id: string;
  backendId?: string;
  status: BookingStatus;
  requiresApproval: boolean;
  confirmationNumber: string;
  createdAtIso: string;
  // Admin review metadata (stored in Supabase; optional in client state).
  adminNote?: string | null;
  reviewState?: string | null;
  reviewedAtIso?: string | null;
  reviewedBy?: string | null;
  requestedChangesAtIso?: string | null;
  // Event
  eventName: string;
  organizerName: string;
  organizerEmail?: string; // for privacy-aware display (e.g. "fva***@uwaterloo.ca")
  eventType: string;
  preferredDate: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM
  durationMinutes: number;
  groupSize: number;
  // Room
  roomId: string;
  roomName: string;
  building: string;
  capacity: number;
  furnitureLabels: string;
  avBadges: string[];
}

const STORAGE_KEY = "roomease.bookings.v1";
const SEQ_KEY = "roomease.confirmationSeq.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getAvBadges(room: Room): string[] {
  const out: string[] = [];
  if (roomIsStreamingRecordingCapable(room)) out.push("Streaming & Recording Ready");
  if (roomIsElectronicClassroom(room)) out.push("Electronic Classroom");
  if (roomHasDocumentCamera(room)) out.push("Document Camera Available");
  return out;
}

function getFurnitureLabelsLine(room: Room): string {
  const short = formatFurniture(room.furniture).short;
  return short ? short.split("; ").join(" • ") : "";
}

function nextConfirmationNumber(seq: number): { confirmationNumber: string; nextSeq: number } {
  const num = String(seq).padStart(3, "0");
  return { confirmationNumber: `CONF-2026-${num}`, nextSeq: seq + 1 };
}

export type BookingUpdate = Partial<
  Pick<
    Booking,
    | "eventName"
    | "organizerName"
    | "preferredDate"
    | "timeSlot"
    | "durationMinutes"
    | "groupSize"
  >
>;

interface BookingsContextValue {
  bookings: Booking[];
  addBooking: (args: AddBookingArgs) => Booking;
  updateBooking: (bookingId: string, updates: BookingUpdate) => void;
  setBookingStatus: (bookingId: string, status: BookingStatus) => void;
  cancelBooking: (bookingId: string) => void;
  replaceBookings: (next: Booking[]) => void;
}

const BookingsContext = createContext<BookingsContextValue | null>(null);

interface AddBookingArgs {
  form: EventFormData;
  room: Room;
  organizerEmail?: string;
  backendBookingId?: string;
}

function loadStoredBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  const stored = safeParse<Booking[]>(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(stored) ? stored : [];
}

function loadStoredSequence(): number {
  if (typeof window === "undefined") return 1;
  const storedSeq = safeParse<number>(localStorage.getItem(SEQ_KEY), 1);
  return typeof storedSeq === "number" && storedSeq > 0 ? storedSeq : 1;
}

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [seq, setSeq] = useState<number>(1);
  const hydratedRef = useRef(false);

  // Read browser storage after hydration so the server and first client render
  // agree. Defer the state update to avoid a synchronous effect cascade.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBookings(loadStoredBookings());
      setSeq(loadStoredSequence());
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cross-tab sync: when another tab adds a booking, storage event fires here
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue) as Booking[];
          if (Array.isArray(next)) setBookings(next);
        } catch {
          // ignore
        }
      }
      if (e.key === SEQ_KEY && e.newValue) {
        try {
          const n = JSON.parse(e.newValue) as number;
          if (typeof n === "number" && n > 0) setSeq(n);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }, [bookings]);
  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(SEQ_KEY, JSON.stringify(seq));
  }, [seq]);

  const addBooking = useCallback(
    ({
      form,
      room,
      organizerEmail,
      backendBookingId,
    }: AddBookingArgs) => {
      const { confirmationNumber, nextSeq: n } = nextConfirmationNumber(seq);
      setSeq(n);
      const createdAtIso = new Date().toISOString();
      const requiresApproval = getRoomMetadataWithDefaults(room.id).approvalRequired === true;
      const status: BookingStatus = requiresApproval ? "pending" : "confirmed";
      const booking: Booking = {
        id: `${confirmationNumber}-${String(room.id)}`,
        backendId: backendBookingId ?? undefined,
        status,
        requiresApproval,
        confirmationNumber,
        createdAtIso,
        eventName: String(form.eventName ?? ""),
        organizerName: String(form.organizerName ?? ""),
        organizerEmail: organizerEmail ?? undefined,
        eventType: String(form.eventType ?? ""),
        preferredDate: String(form.preferredDate ?? ""),
        timeSlot: String(form.timeSlot ?? ""),
        durationMinutes: Number(form.durationMinutes ?? 60),
        groupSize: Number(form.groupSize ?? 0),
        roomId: String(room.id),
        roomName: room.name,
        building: room.building,
        capacity: room.capacity,
        furnitureLabels: getFurnitureLabelsLine(room),
        avBadges: getAvBadges(room),
      };
      setBookings((prev) => [booking, ...prev]);
      return booking;
    },
    [seq]
  );

  const updateBooking = useCallback((bookingId: string, updates: BookingUpdate) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              ...updates,
              id: b.id,
              backendId: b.backendId,
              status: b.status,
              requiresApproval: b.requiresApproval,
              confirmationNumber: b.confirmationNumber,
              createdAtIso: b.createdAtIso,
              roomId: b.roomId,
              roomName: b.roomName,
              building: b.building,
              capacity: b.capacity,
              furnitureLabels: b.furnitureLabels,
              avBadges: b.avBadges,
            }
          : b
      )
    );
  }, []);

  const setBookingStatus = useCallback((bookingId: string, status: BookingStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    );
  }, []);

  const cancelBooking = useCallback((bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  }, []);

  const replaceBookings = useCallback((next: Booking[]) => {
    setBookings(Array.isArray(next) ? next : []);
  }, []);

  const value = useMemo(
    () => ({ bookings, addBooking, updateBooking, setBookingStatus, cancelBooking, replaceBookings }),
    [bookings, addBooking, updateBooking, setBookingStatus, cancelBooking, replaceBookings]
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used within BookingsProvider");
  return ctx;
}

export function formatBookingTime(b: Booking): string {
  return `${formatTimeSlot(b.timeSlot)} • ${formatDuration(b.durationMinutes)}`;
}

