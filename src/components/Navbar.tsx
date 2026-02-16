"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const isHome = pathname === "/";
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

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface-elevated)] backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <ThemeToggle />
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
            onClick={(e) => { if (isHome) { e.preventDefault(); handleHomeClick(e); } }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)] text-black" aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </span>
            <span className="text-xl font-semibold tracking-tight text-[var(--foreground)]">RoomEase</span>
          </Link>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          <a
            href="/"
            onClick={handleHomeClick}
            className={`text-sm font-medium transition-colors duration-200 ${
              isHome ? "text-[var(--foreground)]" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            }`}
          >
            Home
            {isHome && <span className="block h-[1px] w-full bg-[var(--gold)] mt-1" />}
          </a>
          <NavLink href="/rooms" active={isRooms}>Rooms</NavLink>
          <NavLink href="/bookings" active={isBookings}>My Bookings</NavLink>
          <NavLink href="/compare" active={isCompare}>Compare</NavLink>
          <NavLink href="/analytics" active={isAnalytics}>Analytics</NavLink>
          <Link
            href="/book"
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${
              isBook ? "shadow-md" : ""
            }`}
          >
            Start Booking
          </Link>
        </div>
      </nav>
    </header>
  );
}
