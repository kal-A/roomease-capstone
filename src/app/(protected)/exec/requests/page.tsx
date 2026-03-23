"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DateTime } from "luxon";
import { EmptyState } from "@/components/EmptyState";
import { getAppRoleFromEmail } from "@/lib/userRole";
import { ROOMS } from "@/data/rooms";

type RequestRow = {
  id: string;
  status: string;
  created_by_email: string;
  created_by_name?: string | null;
  club_name: string;
  room_id: string;
  event_name?: string | null;
  organizer_name?: string | null;
  group_size?: number | null;
  start_time: string;
  end_time: string;
  executive_note?: string | null;
};

function formatRange(startIso: string, endIso: string): string {
  const s = DateTime.fromISO(startIso).setZone("America/Toronto");
  const e = DateTime.fromISO(endIso).setZone("America/Toronto");
  if (!s.isValid || !e.isValid) return "—";
  return `${s.toFormat("ccc, LLL d")} · ${s.toFormat("h:mm a")} – ${e.toFormat("h:mm a")}`;
}

export default function ExecRequestsPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role ?? getAppRoleFromEmail(session?.user?.email);
  const allowed = role === "executive" || session?.user?.isAdmin;

  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [denyId, setDenyId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState("");

  const roomsById = useMemo(() => new Map(ROOMS.map((r) => [String(r.id), r])), []);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/booking-requests");
    const json = (await res.json().catch(() => ({}))) as { requests?: RequestRow[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Could not load requests");
    setRows(Array.isArray(json.requests) ? json.requests : []);
  }, []);

  useEffect(() => {
    if (!allowed || status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await refetch();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, refetch, status]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending_exec_review"), [rows]);
  const history = useMemo(() => rows.filter((r) => r.status !== "pending_exec_review"), [rows]);

  const review = async (id: string, action: "approve" | "deny", note?: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/booking-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((json as { error?: string }).error ?? "Action failed"));
      await refetch();
      setDenyId(null);
      setDenyNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-16 text-[var(--textSecondary)]">Loading…</div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-16">
        <EmptyState
          title="Executive inbox"
          description="Member recommendations and booking requests from your clubs appear here for club executives and admins."
          suggestion="Sign in with a club executive account to review incoming requests."
          action={
            <Link href="/dashboard" className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primaryText)]">
              Back to dashboard
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)]">Member requests</h1>
        <p className="mt-2 text-lg text-[var(--textSecondary)]">
          Approve to create the booking (or send to admin if the room requires approval). Deny with an optional note.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-[var(--danger)] bg-[var(--dangerBg)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[var(--textSecondary)]">Loading requests…</p>
      ) : pending.length === 0 ? (
        <EmptyState
          title="No member requests yet"
          description="When a club member sends a room recommendation, it will show up here for your review."
          suggestion="Share the booking flow with members so they can propose rooms with full detail."
        />
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => {
            const room = roomsById.get(String(r.room_id));
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{r.event_name ?? "Event"}</p>
                    <p className="text-xs text-[var(--textMuted)] mt-1">
                      From {r.created_by_name ?? r.created_by_email} · {r.club_name}
                    </p>
                    <p className="mt-3 text-sm text-[var(--textSecondary)]">
                      {room?.name ?? r.room_id} · {formatRange(r.start_time, r.end_time)}
                    </p>
                    <p className="text-xs text-[var(--textMuted)] mt-1">
                      Organizer: {r.organizer_name ?? "—"} · Group {r.group_size ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => review(r.id, "approve")}
                      className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primaryText)] disabled:opacity-60"
                    >
                      {acting === r.id ? "Working…" : "Approve & book"}
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => {
                        setDenyId(r.id);
                        setDenyNote("");
                      }}
                      className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--textSecondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {history.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Recent decisions</h2>
          <ul className="space-y-2 text-sm text-[var(--textSecondary)]">
            {history.slice(0, 12).map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] py-2">
                <span className="text-[var(--text)]">{r.event_name ?? r.room_id}</span>
                <span className="font-mono text-xs">{r.status.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {denyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDenyId(null)} aria-hidden />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text)]">Deny request</h3>
            <p className="mt-1 text-sm text-[var(--textSecondary)]">Optional note to the member.</p>
            <textarea
              value={denyNote}
              onChange={(e) => setDenyNote(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
              placeholder="Reason (optional)"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" className="rounded-full border border-[var(--border)] px-4 py-2 text-sm" onClick={() => setDenyId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => denyId && review(denyId, "deny", denyNote)}
              >
                Deny request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
