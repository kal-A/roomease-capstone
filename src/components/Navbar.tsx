"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import type { AppRole } from "@/lib/userRole";
import {
  getAppRoleFromEmail,
  getEffectiveAppRole,
  readAdminPortalMode,
  writeAdminPortalMode,
  type AdminPortalMode,
} from "@/lib/userRole";
import { RoleBadge } from "./RoleBadge";

function ThemeToggle() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    const isLight = root.getAttribute("data-theme") === "light" || stored === "light";
    setThemeState(isLight ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
    }
    setThemeState(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-all duration-300 hover:bg-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <svg className="h-6 w-6 transition-transform duration-300 hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ) : (
        <svg className="h-6 w-6 transition-transform duration-300 hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors duration-200 ${
        active ? "text-[var(--foreground)]" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
      {active && <span className="block h-[1px] w-full bg-[var(--gold)] mt-1" />}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionRole = (session?.user?.role as AppRole | undefined) ?? getAppRoleFromEmail(session?.user?.email);
  const [adminMode, setAdminMode] = useState<AdminPortalMode>("admin");
  useEffect(() => {
    setAdminMode(readAdminPortalMode());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "roomease.adminPortalMode") setAdminMode(readAdminPortalMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const effectiveRole = getEffectiveAppRole(sessionRole, adminMode);
  const showExecTools = effectiveRole === "executive";
  const showMemberStyleBooking = effectiveRole === "member";
  const isHome = pathname === "/";
  const isAuthStage = pathname?.startsWith("/auth");
  const isRooms = pathname === "/rooms";
  const isBook = pathname === "/book";
  const isBookings = pathname === "/bookings";
  const isCompare = pathname === "/compare";
  const isAnalytics = pathname === "/analytics";

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isHome) {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  };

  const primaryButtonClass =
    "shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 bg-[var(--gold)] hover:bg-[var(--gold-hover)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]";
  const primaryButtonStyle = {
    color: "var(--primaryText)" as const,
    boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)",
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // Auth stage should feel focused: no nav links.
  if (isAuthStage) {
    return (
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface-elevated)] backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <ThemeToggle />
            <a
              href="/"
              onClick={handleHomeClick}
              className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
              aria-label="RoomEase — Home"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]"
                style={{ color: "var(--primaryText)" }}
                aria-hidden
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <path d="M9 22V12h6v10" />
                </svg>
              </span>
              <span className="text-xl font-semibold tracking-tight text-[var(--foreground)]">RoomEase</span>
            </a>
          </div>
          {/* no links during auth stage */}
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface-elevated)] backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <ThemeToggle />
          <a
            href="/"
            onClick={handleHomeClick}
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
            aria-label="RoomEase — Home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]" style={{ color: "var(--primaryText)" }} aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </span>
            <span className="text-xl font-semibold tracking-tight text-[var(--foreground)]">RoomEase</span>
          </a>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          {status === "loading" ? (
            <span className="h-9 w-20 shrink-0 rounded-full bg-[var(--border)]/40" aria-hidden />
          ) : session ? (
            <>
              <NavLink href="/rooms" active={isRooms}>Rooms</NavLink>
              <NavLink href="/bookings" active={isBookings}>My Bookings</NavLink>
              <NavLink href="/compare" active={isCompare}>Compare</NavLink>
              <NavLink href="/analytics" active={isAnalytics}>Analytics</NavLink>
              <NavLink href="/dashboard" active={pathname === "/dashboard"}>Dashboard</NavLink>
              {showExecTools && (
                <NavLink href="/exec/requests" active={pathname === "/exec/requests"}>
                  Requests
                </NavLink>
              )}
              {session.user?.isAdmin && (
                <NavLink href="/admin" active={pathname?.startsWith("/admin")}>
                  Admin
                </NavLink>
              )}
              <Link
                href="/book"
                className={`${primaryButtonClass} ${isBook ? "shadow-md" : ""}`}
                style={primaryButtonStyle}
              >
                {showMemberStyleBooking ? "Find a room" : "Start Booking"}
              </Link>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="inline-flex max-w-[280px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--text)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:bg-[var(--surfaceElevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] active:scale-[0.99]"
                  title={session.user?.email ?? undefined}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  <RoleBadge role={effectiveRole} compact />
                  <span className="truncate">
                    {session.user?.name ?? session.user?.email ?? "Profile"}
                  </span>
                  <svg className={`h-4 w-4 shrink-0 text-[var(--textMuted)] transition-transform ${profileOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -6 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surfaceElevated)] shadow-[var(--shadowLg)] backdrop-blur-md"
                      role="menu"
                    >
                      <div className="px-4 py-3 border-b border-[var(--border)] space-y-2">
                        <p className="text-xs font-semibold text-[var(--textSecondary)]">Signed in as</p>
                        <p className="text-sm font-medium text-[var(--text)] truncate">{session.user?.email ?? "—"}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-[var(--textMuted)]">Role</span>
                          <RoleBadge role={sessionRole} />
                        </div>
                        {sessionRole === "admin" && adminMode === "user" && (
                          <p className="text-[11px] text-[var(--textSecondary)] leading-snug">
                            User view is visual-only. Admin permissions remain unchanged.
                          </p>
                        )}
                      </div>
                      {session.user?.isAdmin && (
                        <div className="border-b border-[var(--border)] px-4 py-3 space-y-2">
                          <p className="text-xs font-semibold text-[var(--textSecondary)]">Portal mode</p>
                          <div
                            className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5"
                            role="group"
                            aria-label="Admin or user view"
                          >
                            <button
                              type="button"
                              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                adminMode === "admin"
                                  ? "bg-[var(--gold)] text-[var(--primaryText)] shadow-sm"
                                  : "text-[var(--textSecondary)] hover:text-[var(--text)]"
                              }`}
                              onClick={() => {
                                writeAdminPortalMode("admin");
                                setAdminMode("admin");
                              }}
                            >
                              Admin
                            </button>
                            <button
                              type="button"
                              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                adminMode === "user"
                                  ? "bg-[var(--gold)] text-[var(--primaryText)] shadow-sm"
                                  : "text-[var(--textSecondary)] hover:text-[var(--text)]"
                              }`}
                              onClick={() => {
                                writeAdminPortalMode("user");
                                setAdminMode("user");
                              }}
                            >
                              User
                            </button>
                          </div>
                        </div>
                      )}
                      {session.user?.isAdmin && (
                        <Link
                          href="/admin"
                          className="flex w-full items-center px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--primary)]/10"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                        >
                          Admin Portal
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex w-full items-center px-4 py-2.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
                        role="menuitem"
                      >
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
