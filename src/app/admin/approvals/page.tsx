"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/EmptyState";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { getRoomMetadataWithDefaults } from "@/data/roomMetadata";
import {
  getBlockedSlots,
  closeBuilding,
  blockRoom,
  removeBlock,
} from "@/lib/blockingStore";

type AdminStatus = "Pending" | "Approved" | "Denied" | "Confirmed";

interface AdminBooking {
  id: string;
  status: AdminStatus;
  roomId: string;
  buildingCode: string;
  buildingName: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  duration: string; // human label
  groupSize: number;
  eventName: string;
  organizerName: string;
  organizerEmail: string;
  furnitureNeeds: string;
  avNeeds: string;
  submittedAt: string; // ISO string
  notes: string;
  conflictSummary: string;
}

const MOCK_BOOKINGS: AdminBooking[] = [];
/*
  {
    id: "1",
    status: "Pending",
    roomId: "AL 210",
    buildingCode: "AL",
    buildingName: "Arts Lecture Hall",
    date: "2025-02-24",
    startTime: "15:00",
    endTime: "16:30",
    duration: "1.5 hours",
    groupSize: 80,
    eventName: "CS Club Interview Prep Workshop",
    organizerName: "UW CS Club",
    organizerEmail: "csclub@uwaterloo.ca",
    furnitureNeeds: "Theatre-style fixed seating",
    avNeeds: "Electronic Classroom, Streaming & Recording",
    submittedAt: "2025-02-20T10:24:00Z",
    notes: "Needs AV to be ready 15 minutes early.",
    conflictSummary: "No conflicts detected.",
  },
  {
    id: "2",
    status: "Pending",
    roomId: "RCH 301",
    buildingCode: "RCH",
    buildingName: "J.R. Coutts Engineering Lecture Hall",
    date: "2025-02-25",
    startTime: "18:00",
    endTime: "20:00",
    duration: "2 hours",
    groupSize: 40,
    eventName: "Engineering Society Council Meeting",
    organizerName: "EngSoc A",
    organizerEmail: "engsoc-a@uwaterloo.ca",
    furnitureNeeds: "Tables in U-shape with extra chairs",
    avNeeds: "Doc Camera, Microphones, Projector",
    submittedAt: "2025-02-20T09:10:00Z",
    notes: "Requires recording for students on co-op.",
    conflictSummary: "Conflicts with 1 tentative hold (low priority).",
  },
  {
    id: "3",
    status: "Approved",
    roomId: "MC 4020",
    buildingCode: "MC",
    buildingName: "Mathematics & Computer",
    date: "2025-02-22",
    startTime: "11:30",
    endTime: "13:00",
    duration: "1.5 hours",
    groupSize: 24,
    eventName: "Grad Thesis Defense – Algorithms",
    organizerName: "Cheriton School of Computer Science",
    organizerEmail: "grad-admin@uwaterloo.ca",
    furnitureNeeds: "Boardroom layout with podium",
    avNeeds: "Streaming & Recording",
    submittedAt: "2025-02-18T14:05:00Z",
    notes: "External examiner joining via Zoom.",
    conflictSummary: "No conflicts detected.",
  },
  {
    id: "4",
    status: "Denied",
    roomId: "HH 1102",
    buildingCode: "HH",
    buildingName: "Hagey Hall",
    date: "2025-02-23",
    startTime: "19:00",
    endTime: "22:00",
    duration: "3 hours",
    groupSize: 120,
    eventName: "Late Night Movie Marathon",
    organizerName: "Film Society",
    organizerEmail: "filmsoc@uwaterloo.ca",
    furnitureNeeds: "Theatre seating",
    avNeeds: "5.1 Audio, Projector",
    submittedAt: "2025-02-17T20:40:00Z",
    notes: "Noise concerns after quiet hours.",
    conflictSummary: "Conflicts with building quiet policy after 10 PM.",
  },
  {
    id: "5",
    status: "Pending",
    roomId: "E5 2004",
    buildingCode: "E5",
    buildingName: "Engineering 5",
    date: "2025-02-26",
    startTime: "09:30",
    endTime: "11:00",
    duration: "1.5 hours",
    groupSize: 28,
    eventName: "Capstone Design Check-in",
    organizerName: "ECE Department",
    organizerEmail: "ece-capstone@uwaterloo.ca",
    furnitureNeeds: "Group tables with whiteboards",
    avNeeds: "Document Camera, Projector",
    submittedAt: "2025-02-21T08:55:00Z",
    notes: "Students bringing their own laptops.",
    conflictSummary: "No conflicts detected.",
  },
  {
    id: "6",
    status: "Approved",
    roomId: "DC 1350",
    buildingCode: "DC",
    buildingName: "Davis Centre",
    date: "2025-02-21",
    startTime: "17:00",
    endTime: "19:00",
    duration: "2 hours",
    groupSize: 60,
    eventName: "Tech Talk: Distributed Systems at Scale",
    organizerName: "WiCS & CSC",
    organizerEmail: "wics@uwaterloo.ca",
    furnitureNeeds: "Theatre seating with aisle",
    avNeeds: "Streaming & Recording, Wireless Mic",
    submittedAt: "2025-02-16T16:20:00Z",
    notes: "Speaker needs HDMI + USB-C adapters.",
    conflictSummary: "No conflicts detected.",
  },
  {
    id: "7",
    status: "Pending",
    roomId: "QNC 1502",
    buildingCode: "QNC",
    buildingName: "Quantum-Nano Centre",
    date: "2025-02-27",
    startTime: "13:00",
    endTime: "15:30",
    duration: "2.5 hours",
    groupSize: 50,
    eventName: "Quantum Computing Seminar",
    organizerName: "IQC",
    organizerEmail: "iqc-events@uwaterloo.ca",
    furnitureNeeds: "Lecture seating with front tables",
    avNeeds: "Streaming & Recording, Laser Pointer",
    submittedAt: "2025-02-20T13:30:00Z",
    notes: "Will invite external industry partners.",
    conflictSummary: "No conflicts detected.",
  },
  {
    id: "8",
    status: "Denied",
    roomId: "AL 113",
    buildingCode: "AL",
    buildingName: "Arts Lecture Hall",
    date: "2025-02-28",
    startTime: "08:00",
    endTime: "10:00",
    duration: "2 hours",
    groupSize: 150,
    eventName: "External Conference – Non-UW Org",
    organizerName: "External Partner",
    organizerEmail: "events@external.org",
    furnitureNeeds: "Theatre seating",
    avNeeds: "Full AV package",
    submittedAt: "2025-02-15T11:10:00Z",
    notes: "Requires special approval for external billing.",
    conflictSummary: "Rejected due to external event policy.",
  },
  {
    id: "9",
    status: "Approved",
    roomId: "STC 1012",
    buildingCode: "STC",
    buildingName: "Science Teaching Complex",
    date: "2025-03-01",
    startTime: "10:00",
    endTime: "12:00",
    duration: "2 hours",
    groupSize: 32,
    eventName: "Lab Safety Training",
    organizerName: "Science Safety Office",
    organizerEmail: "science-safety@uwaterloo.ca",
    furnitureNeeds: "Classroom tables",
    avNeeds: "Projector, Speakers",
    submittedAt: "2025-02-14T09:00:00Z",
    notes: "Mandatory for all new lab members.",
    conflictSummary: "No conflicts detected.",
  },
  {
    id: "10",
    status: "Pending",
    roomId: "E7 2302",
    buildingCode: "E7",
    buildingName: "Engineering 7",
    date: "2025-03-02",
    startTime: "14:00",
    endTime: "17:00",
    duration: "3 hours",
    groupSize: 110,
    eventName: "Co-op Networking Night",
    organizerName: "Co-operative Education",
    organizerEmail: "coop-events@uwaterloo.ca",
    furnitureNeeds: "High-top tables + mingling space",
    avNeeds: "Background music, Wireless Mic",
    submittedAt: "2025-02-19T19:45:00Z",
    notes: "Catering will be arranged separately.",
    conflictSummary: "Conflicts with custodial schedule (needs coordination).",
  },
];
*/

type StatusFilter = "all" | "pending" | "approved" | "denied";
type SortOption = "newest" | "oldest";

interface ToastState {
  id: number;
  message: string;
  variant: "success" | "danger";
}

function roomKeyFromAdminRoomId(roomId: string): string {
  const trimmed = String(roomId || "").trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return `${parts[0]}-${parts[1]}`;
  return trimmed.replace(/\s+/g, "-");
}

function timeAgoLabel(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function startsWhenLabel(date: string, startTime: string): string {
  const start = new Date(`${date}T${startTime}`);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (diffH < 0) return `Started ${time}`;
  if (diffH < 24) return `Starts today at ${time}`;
  if (diffH < 48) return `Starts tomorrow at ${time}`;
  const day = start.toLocaleDateString(undefined, { weekday: "short" });
  return `Starts ${day} at ${time}`;
}

function formatDateTimeLabel(booking: AdminBooking): string {
  const date = new Date(`${booking.date}T${booking.startTime}`);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const day = date.getDate();

  const formatTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  return `${weekday} ${month} ${day} · ${formatTime(booking.startTime)}–${formatTime(booking.endTime)}`;
}

function getCapacityBucketLabel(size: number): string {
  if (size <= 50) return `Small · ${size}`;
  if (size <= 150) return `Medium · ${size}`;
  return `Large · ${size}`;
}

function statusStyles(status: AdminStatus): { badge: string } {
  switch (status) {
    case "Approved":
      return {
        badge:
          "inline-flex items-center gap-1 rounded-full border border-[var(--successBorder)] bg-[var(--successBg)] px-2.5 py-1 text-xs font-medium text-[var(--success)]",
      };
    case "Denied":
      return {
        badge:
          "inline-flex items-center gap-1 rounded-full border border-[var(--dangerBorder)] bg-[var(--dangerBg)] px-2.5 py-1 text-xs font-medium text-[var(--danger)]",
      };
    case "Confirmed":
      return {
        badge:
          "inline-flex items-center gap-1 rounded-full border border-[var(--successBorder)] bg-[var(--successBg)] px-2.5 py-1 text-xs font-medium text-[var(--success)]",
      };
    default:
      return {
        badge:
          "inline-flex items-center gap-1 rounded-full border border-[var(--primaryBorder)] bg-[var(--primarySubtle)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]",
      };
  }
}

function statusLabel(status: AdminStatus): string {
  switch (status) {
    case "Pending":
      return "Pending Approval";
    case "Approved":
      return "Approved";
    case "Denied":
      return "Denied";
    case "Confirmed":
      return "Confirmed";
    default:
      return "Pending Approval";
  }
}

export default function AdminApprovalsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionLoading, setActionLoading] = useState<{ id: string; type: "approve" | "deny" } | null>(null);
  const [blockVersion, setBlockVersion] = useState(0);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [closeBuildingCode, setCloseBuildingCode] = useState("");
  const [closeBuildingDate, setCloseBuildingDate] = useState("");
  const [blockRoomId, setBlockRoomId] = useState("");
  const [blockRoomDate, setBlockRoomDate] = useState("");
  const blocks = useMemo(() => getBlockedSlots(), [blockVersion]);

  const refetchBookings = useCallback(async () => {
    const res = await fetch("/api/admin/bookings", { method: "GET" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      const msg = typeof json.error === "string" ? json.error : "Could not load bookings.";
      throw new Error(msg);
    }

    const json = (await res.json().catch(() => ({}))) as { bookings?: unknown };
    const list = Array.isArray(json.bookings) ? (json.bookings as AdminBooking[]) : [];
    setBookings(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refetchBookings();
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Could not load bookings.";
        showToast(msg, "danger");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refetchBookings]);

  const filtered = useMemo(() => {
    let list = bookings;

    if (statusFilter !== "all") {
      const target: AdminStatus =
        statusFilter === "pending" ? "Pending" : statusFilter === "approved" ? "Approved" : "Denied";
      list = list.filter((b) => b.status === target);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) => {
        return (
          b.roomId.toLowerCase().includes(q) ||
          b.buildingName.toLowerCase().includes(q) ||
          b.eventName.toLowerCase().includes(q) ||
          b.organizerName.toLowerCase().includes(q) ||
          b.organizerEmail.toLowerCase().includes(q)
        );
      });
    }

    list = [...list].sort((a, b) => {
      const aTime = new Date(a.submittedAt).getTime();
      const bTime = new Date(b.submittedAt).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [bookings, statusFilter, sort, search]);

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "Pending").length;
    // Demo-friendly: treat all approved/denied in the current dataset as "today"
    const approvedToday = bookings.filter((b) => b.status === "Approved").length;
    const confirmedToday = bookings.filter((b) => b.status === "Confirmed").length;
    const deniedToday = bookings.filter((b) => b.status === "Denied").length;
    const requiringApprovalRooms = new Set(
      bookings
        .map((b) => roomKeyFromAdminRoomId(b.roomId))
        .filter((key) => getRoomMetadataWithDefaults(key).approvalRequired)
    );
    return { pending, approvedToday, confirmedToday, deniedToday, requiringApprovalRoomsCount: requiringApprovalRooms.size };
  }, [bookings]);

  const needsAttention = useMemo(() => {
    const list = bookings
      .filter((b) => b.status === "Pending")
      .map((b) => {
        const start = new Date(`${b.date}T${b.startTime}`).getTime();
        const hoursUntil = (start - Date.now()) / (1000 * 60 * 60);
        const isSoon = hoursUntil >= 0 && hoursUntil <= 24;
        const hasConflict = (b.conflictSummary || "").toLowerCase().includes("conflict");
        return { b, score: (isSoon ? 2 : 0) + (hasConflict ? 1 : 0), isSoon, hasConflict };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return list;
  }, [bookings]);

  const showToast = (message: string, variant: "success" | "danger" | "info") => {
    const id = Date.now();
    setToast({ id, message, variant: variant === "info" ? "success" : variant });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2500);
  };

  const handleApprove = async (id: string) => {
    if (actionLoading?.id === id && actionLoading?.type === "approve") return;
    setActionLoading({ id, type: "approve" });
    try {
      const res = await fetch("/api/admin/bookings/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: unknown };
        const msg = typeof json.error === "string" ? json.error : "Could not approve booking.";
        throw new Error(msg);
      }
      showToast("Booking approved", "success");
      await refetchBookings();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not approve booking.";
      showToast(msg, "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: string) => {
    if (actionLoading?.id === id && actionLoading?.type === "deny") return;
    setActionLoading({ id, type: "deny" });
    try {
      const res = await fetch("/api/admin/bookings/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: unknown };
        const msg = typeof json.error === "string" ? json.error : "Could not deny booking.";
        throw new Error(msg);
      }
      showToast("Booking denied", "success");
      await refetchBookings();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not deny booking.";
      showToast(msg, "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndo = (_id: string) => {
    // Undo is not wired to the backend in this task.
    showToast("Undo not supported.", "info");
  };

  const handleRequestChanges = (_id: string) => {
    // Keep as a UI affordance; not part of the approve/deny backend integration.
    showToast("Request changes is not wired yet.", "info");
  };

  const handleCloseBuilding = () => {
    if (!closeBuildingCode.trim() || !closeBuildingDate.trim()) return;
    closeBuilding(closeBuildingCode.trim(), closeBuildingDate.trim());
    setBlockVersion((v) => v + 1);
    setCloseBuildingCode("");
    setCloseBuildingDate("");
    showToast(`Building ${closeBuildingCode} closed for ${closeBuildingDate}`, "success");
  };

  const handleBlockRoom = () => {
    if (!blockRoomId.trim() || !blockRoomDate.trim()) return;
    blockRoom(blockRoomId.trim(), blockRoomDate.trim());
    setBlockVersion((v) => v + 1);
    setBlockRoomId("");
    setBlockRoomDate("");
    showToast(`Room ${blockRoomId} blocked for ${blockRoomDate}`, "success");
  };

  const handleRemoveBlock = (id: string) => {
    removeBlock(id);
    setBlockVersion((v) => v + 1);
    showToast("Block removed", "success");
  };

  const hasResults = filtered.length > 0;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            Admin Approvals
          </h1>
          <p className="mt-2 text-lg text-[var(--textSecondary)]">
            Review and approve or deny pending booking requests.
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadowSm)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Pending requests</p>
          <p className="mt-2 text-3xl font-bold text-[var(--primary)]">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadowSm)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Approved today</p>
          <p className="mt-2 text-3xl font-bold text-[var(--success)]">{stats.approvedToday}</p>
          <p className="mt-2 text-xs text-[var(--textMuted)]">
            Confirmed: <span className="font-semibold text-[var(--textSecondary)]">{stats.confirmedToday}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadowSm)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Denied today</p>
          <p className="mt-2 text-3xl font-bold text-[var(--danger)]">{stats.deniedToday}</p>
          <p className="mt-2 text-xs text-[var(--textMuted)]">
            Rooms requiring approval:{" "}
            <span className="font-semibold text-[var(--textSecondary)]">{stats.requiringApprovalRoomsCount}</span>
          </p>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6" style={{ borderRadius: "var(--radiusLg)" }}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--text)]">Needs attention</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {needsAttention.map(({ b, isSoon, hasConflict }) => (
              <div key={b.id} className="rounded-xl border border-[var(--border)] bg-[var(--surfaceElevated)] p-4">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{b.eventName}</p>
                <p className="mt-1 text-xs text-[var(--textSecondary)]">{b.roomId} · {formatDateTimeLabel(b)}</p>
                <p className="mt-2 text-xs text-[var(--textMuted)]">{startsWhenLabel(b.date, b.startTime)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isSoon && <span className="inline-flex rounded-full border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">Starting soon</span>}
                  {hasConflict && <span className="inline-flex rounded-full border border-[var(--danger)]/35 bg-[var(--dangerBg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--danger)]">Conflict</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by room, event, or organizer..."
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-5 py-3 text-[var(--text)] placeholder-[var(--textMuted)] transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
            aria-label="Search approvals"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
            {[
              { key: "pending" as StatusFilter, label: "Pending Approval" },
              { key: "approved" as StatusFilter, label: "Approved" },
              { key: "denied" as StatusFilter, label: "Denied" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusFilter(opt.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                  statusFilter === opt.key
                    ? "bg-[var(--primary)] text-[var(--primaryText)] shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                    : "text-[var(--textSecondary)] hover:text-[var(--text)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs sm:text-sm text-[var(--textSecondary)]">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs sm:text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      {!hasResults ? (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12 text-[var(--textMuted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.4}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="No bookings match your filters"
          description="Try adjusting the status filter or search to see more requests."
          suggestion="You can clear filters to review all pending approvals."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="rounded-full border-2 border-[var(--primary)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--primary)] transition-all duration-200 hover:bg-[var(--primary)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map((b) => {
              const statusStyle = statusStyles(b.status);
              const isExpanded = expandedId === b.id;
              const key = roomKeyFromAdminRoomId(b.roomId);
              const meta = getRoomMetadataWithDefaults(key);
              const approvalRequired = meta.approvalRequired === true;

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <motion.article
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-[var(--shadowSm)] hover:shadow-[var(--shadowMd)] transition-all duration-200"
                    style={{ borderRadius: "var(--radiusLg)" }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold tracking-tight text-[var(--text)]">{b.roomId}</p>
                          <p className="text-xs text-[var(--textSecondary)]">
                            {b.buildingCode} — {b.buildingName}
                          </p>
                        </div>
                        <p className="text-sm text-[var(--textSecondary)]">
                          {formatDateTimeLabel(b)} · {b.duration}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className={statusStyle.badge}>{statusLabel(b.status)}</span>
                          {approvalRequired && <ApprovalBadge variant="required" />}
                          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surfaceElevated)] px-2.5 py-1 text-xs font-medium text-[var(--textSecondary)]">
                            Group {b.groupSize} · {getCapacityBucketLabel(b.groupSize)}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surfaceElevated)] px-2.5 py-1 text-xs font-medium text-[var(--textSecondary)]">
                            {b.avNeeds}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surfaceElevated)] px-2.5 py-1 text-xs font-medium text-[var(--textSecondary)]">
                            {b.furnitureNeeds}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch gap-2 sm:items-end min-w-[180px]">
                        <div className="text-right">
                          <p className="text-sm font-medium text-[var(--text)] truncate max-w-xs">{b.eventName}</p>
                          <p className="mt-0.5 text-xs text-[var(--textSecondary)] truncate max-w-xs">
                            {b.organizerName} · {b.organizerEmail}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--textMuted)]">
                            Submitted {timeAgoLabel(b.submittedAt)} · {startsWhenLabel(b.date, b.startTime)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {b.status === "Pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(b.id)}
                                disabled={actionLoading?.id === b.id && actionLoading?.type === "approve"}
                                className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primaryText)] shadow-[0_2px_8px_var(--primaryGlow)] transition-all duration-200 hover:bg-[var(--primaryHover)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)] disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                {actionLoading?.id === b.id && actionLoading?.type === "approve"
                                  ? "Approving..."
                                  : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeny(b.id)}
                                disabled={actionLoading?.id === b.id && actionLoading?.type === "deny"}
                                className="rounded-full border border-[var(--danger)] bg-transparent px-4 py-2 text-xs font-semibold text-[var(--danger)] transition-all duration-200 hover:bg-[var(--danger)]/10 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/60 disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                {actionLoading?.id === b.id && actionLoading?.type === "deny" ? "Denying..." : "Deny"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestChanges(b.id)}
                                className="rounded-full border border-[var(--border)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--textSecondary)] transition-all duration-200 hover:text-[var(--text)] hover:border-[var(--primary)]/50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                              >
                                Request changes
                              </button>
                            </>
                          ) : b.status === "Approved" || b.status === "Denied" ? (
                            <button
                              type="button"
                              onClick={() => handleUndo(b.id)}
                              className="rounded-full border border-[var(--border)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--textSecondary)] transition-all duration-200 hover:text-[var(--text)] hover:border-[var(--borderStrong)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                            >
                              Undo
                            </button>
                          ) : (
                            <span className="inline-flex h-10" />
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedId((prev) => (prev === b.id ? null : b.id))}
                            className="rounded-full border border-[var(--border)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--textSecondary)] transition-all duration-200 hover:text-[var(--text)] hover:border-[var(--borderStrong)] focus:outline-none focus:ring-2 focus:ring-[var(--focusRing)]"
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -4 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--textSecondary)] space-y-3"
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">
                                Submitted
                              </p>
                              <p className="mt-0.5 text-[var(--text)]">
                                {new Date(b.submittedAt).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">
                                Organizer
                              </p>
                              <p className="mt-0.5 text-[var(--text)]">{b.organizerName}</p>
                              <p className="text-xs text-[var(--textSecondary)]">{b.organizerEmail}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">
                                Room details
                              </p>
                              <p className="mt-0.5 text-[var(--text)]">
                                {b.roomId} · {b.buildingCode} — {b.buildingName}
                              </p>
                              <p className="text-xs text-[var(--textSecondary)]">
                                Group size {b.groupSize} ({getCapacityBucketLabel(b.groupSize)})
                              </p>
                              <div className="mt-2 grid gap-1.5 text-xs">
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--textSecondary)]">Room owner</span>
                                  <span className="text-[var(--text)]">
                                    {getRoomMetadataWithDefaults(roomKeyFromAdminRoomId(b.roomId)).roomOwnerDepartment}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--textSecondary)]">Approval policy</span>
                                  <span className="text-[var(--text)]">
                                    {getRoomMetadataWithDefaults(roomKeyFromAdminRoomId(b.roomId)).approvalRequired ? "Requires admin approval" : "Instant booking"}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--textSecondary)]">Requested by</span>
                                  <span className="text-[var(--text)]">{b.organizerEmail}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">
                                Notes
                              </p>
                              <p className="mt-0.5 text-[var(--text)]">{b.notes}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--surfaceElevated)] p-3 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">
                                Conflict check
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--textSecondary)]">{b.conflictSummary}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-[var(--textSecondary)]">
                              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                              <span>Demo-only</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Facility: building closures & room blocking */}
      <div className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6" style={{ borderRadius: "var(--radiusLg)" }}>
        <button
          type="button"
          onClick={() => setFacilityOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-[var(--text)]">Building closures & room blocking</h2>
          <span className="text-[var(--textMuted)]">{facilityOpen ? "▼" : "▶"}</span>
        </button>
        {facilityOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 space-y-4 border-t border-[var(--border)] pt-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--textSecondary)]">Close building (full day)</label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={closeBuildingCode}
                    onChange={(e) => setCloseBuildingCode(e.target.value)}
                    placeholder="e.g. AL"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] w-24"
                  />
                  <input
                    type="date"
                    value={closeBuildingDate}
                    onChange={(e) => setCloseBuildingDate(e.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                  />
                  <button
                    type="button"
                    onClick={handleCloseBuilding}
                    className="rounded-full bg-[var(--primary)]/20 px-4 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/30"
                  >
                    Apply
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--textSecondary)]">Block room (full day)</label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={blockRoomId}
                    onChange={(e) => setBlockRoomId(e.target.value)}
                    placeholder="Room ID"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] w-24"
                  />
                  <input
                    type="date"
                    value={blockRoomDate}
                    onChange={(e) => setBlockRoomDate(e.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                  />
                  <button
                    type="button"
                    onClick={handleBlockRoom}
                    className="rounded-full bg-[var(--primary)]/20 px-4 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/30"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
            {blocks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--textSecondary)]">Active blocks</p>
                <ul className="space-y-2">
                  {blocks.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surfaceElevated)] px-4 py-2 text-sm"
                    >
                      <span className="text-[var(--text)]">
                        {b.building && `Building ${b.building}`}
                        {b.roomId && ` Room ${b.roomId}`} — {b.date}
                        {b.reason && ` · ${b.reason}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(b.id)}
                        className="rounded-full border border-[var(--danger)]/50 px-3 py-1 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div
              className={`rounded-full border px-4 py-2 text-xs sm:text-sm font-medium shadow-[var(--shadowMd)] backdrop-blur-md ${
                toast.variant === "success"
                  ? "border-[var(--successBorder)] bg-[var(--successBg)] text-[var(--success)]"
                  : "border-[var(--dangerBorder)] bg-[var(--dangerBg)] text-[var(--danger)]"
              }`}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

