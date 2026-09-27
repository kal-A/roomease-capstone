"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "roomease.compare.v1";
const MAX_COMPARE = 4;

function loadStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

interface CompareContextValue {
  compareIds: string[];
  addToCompare: (roomId: string | number) => void;
  removeFromCompare: (roomId: string | number) => void;
  clearCompare: () => void;
  isInCompare: (roomId: string | number) => boolean;
  toggleCompare: (roomId: string | number) => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setCompareIds(loadStored());
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (compareIds.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [compareIds]);

  const addToCompare = useCallback((roomId: string | number) => {
    const id = String(roomId);
    setCompareIds((prev) => {
      if (prev.includes(id) || prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);

  const removeFromCompare = useCallback((roomId: string | number) => {
    const id = String(roomId);
    setCompareIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const isInCompare = useCallback(
    (roomId: string | number) => compareIds.includes(String(roomId)),
    [compareIds]
  );

  const toggleCompare = useCallback((roomId: string | number) => {
    const id = String(roomId);
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);

  const value = useMemo(
    () => ({
      compareIds,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      toggleCompare,
    }),
    [compareIds, addToCompare, removeFromCompare, clearCompare, isInCompare, toggleCompare]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
