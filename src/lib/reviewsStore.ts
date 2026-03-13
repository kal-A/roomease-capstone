"use client";

/**
 * Room reviews and ratings — stored locally for demo.
 * Replace with API later.
 */

const STORAGE_KEY = "roomease.roomReviews";

export type ReviewDimension = "lighting" | "noise" | "comfort" | "avReliability";

export interface RoomReview {
  roomId: string;
  /** 1–5 per dimension */
  lighting: number;
  noise: number;
  comfort: number;
  avReliability: number;
  createdAt: string; // ISO
}

function loadReviews(): RoomReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReviews(reviews: RoomReview[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // ignore
  }
}

export function getReviewsForRoom(roomId: string | number): RoomReview[] {
  const id = String(roomId);
  return loadReviews().filter((r) => r.roomId === id);
}

/** Stable hash of roomId -> 8–220 for deterministic display count (no randomness on refresh) */
export function getDisplayReviewCount(roomId: string | number): number {
  const s = String(roomId);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return 8 + (h % 213); // 8 to 220
}

export function getRoomRating(roomId: string | number): { average: number; count: number; displayCount: number } {
  const reviews = getReviewsForRoom(roomId);
  const displayCount = getDisplayReviewCount(roomId);
  if (reviews.length === 0) return { average: 0, count: 0, displayCount };
  const sum = reviews.reduce((acc, r) => {
    return acc + (r.lighting + r.noise + r.comfort + r.avReliability) / 4;
  }, 0);
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
    displayCount,
  };
}

export function submitReview(roomId: string | number, review: Omit<RoomReview, "roomId" | "createdAt">): void {
  const id = String(roomId);
  const all = loadReviews();
  const newReview: RoomReview = {
    roomId: id,
    ...review,
    createdAt: new Date().toISOString(),
  };
  const next = [...all.filter((r) => r.roomId !== id), newReview];
  saveReviews(next);
}
