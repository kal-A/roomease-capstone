"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

const NAVBAR_OFFSET = 72; // sticky header height for scroll offset

function HomePageContent() {
  const pathname = usePathname();
  const hasScrolledRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState<"learn-more" | "why" | "about" | null>(null);
  const [showSectionNav, setShowSectionNav] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const userFirstName = (() => {
    const fullName = session?.user?.name ?? "";
    const trimmed = fullName.trim();
    if (!trimmed) return null;
    const first = trimmed.split(/\s+/)[0];
    if (!first) return null;
    return first.charAt(0).toUpperCase() + first.slice(1);
  })();

  // Scroll to hash on mount (e.g. user came from /rooms via /#why)
  useEffect(() => {
    if (pathname !== "/") {
      hasScrolledRef.current = false;
      return;
    }
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      const y = el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
      setTimeout(() => {
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }, 120);
    }
  }, [pathname]);

  // Handle hash change when already on homepage (e.g. in-page link)
  useEffect(() => {
    if (pathname !== "/") return;
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  // Floating section nav: track sections + show after hero
  useEffect(() => {
    if (pathname !== "/") return;
    const sectionIds: Array<"learn-more" | "why" | "about"> = ["learn-more", "why", "about"];
    const observer = new IntersectionObserver(
      (entries) => {
        let current: "learn-more" | "why" | "about" | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id as "learn-more" | "why" | "about";
            current = id;
            break;
          }
        }
        if (current) {
          setActiveSection(current);
        }
      },
      {
        root: null,
        threshold: 0.3,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      const heroEl = document.getElementById("hero");
      const heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 360;
      const trigger = Math.max(300, heroBottom - 120);
      setShowSectionNav(y > trigger);

      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setScrollProgress(Math.max(0, Math.min(1, y / max)));

      lastScrollYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  const handleSectionClick = (id: "learn-more" | "why" | "about") => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Hero */}
      <section id="hero" className="mx-auto max-w-[1200px] px-6 pt-24 pb-32 sm:px-8 sm:pt-32 sm:pb-40 lg:px-10">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <AnimatePresence>
            {userFirstName && (
              <motion.p
                key="greeting"
                className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-[var(--textSecondary)]"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                Welcome back, {userFirstName}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.h1
            className="text-5xl font-bold tracking-tight text-[var(--text)] sm:text-6xl lg:text-7xl"
            style={{ letterSpacing: "-0.02em" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            Intelligent Room Booking
          </motion.h1>
          <motion.p
            className="mt-6 text-xl leading-relaxed text-[var(--textSecondary)] sm:text-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
          >
            Automated, policy-aware room recommendations in seconds.
          </motion.p>

          {/* Row 1: primary CTAs */}
          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease: "easeOut" }}
          >
            <Link
              href="/book"
              className="w-full rounded-full bg-[var(--primary)] px-8 py-4 text-center text-base font-semibold shadow-lg transition-all duration-200 hover:bg-[var(--primaryHover)] hover:-translate-y-0.5 hover:shadow-xl sm:w-auto sm:min-w-[180px]"
              style={{ color: "var(--primaryText)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px var(--primaryGlow)" }}
            >
              Start Booking
            </Link>
            <Link
              href="/rooms"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-8 py-4 text-center text-base font-semibold text-[var(--text)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:bg-[var(--surfaceElevated)] hover:-translate-y-0.5 sm:w-auto sm:min-w-[180px]"
            >
              Browse Rooms
            </Link>
          </motion.div>

          {/* Row 2: secondary in-page navigation */}
          <motion.div
            className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          >
            <div className="inline-flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/#learn-more"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
              >
                Learn More
              </Link>
              <Link
                href="/#why"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
              >
                Why RoomEase
              </Link>
              <Link
                href="/#about"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--textSecondary)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
              >
                About Us
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature cards */}
      <section
        id="learn-more"
        className="scroll-mt-24 border-t border-[var(--border)] py-24 sm:py-32"
        style={{ scrollMarginTop: `${NAVBAR_OFFSET}px` }}
      >
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-10">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              Features
            </h2>
            <p className="mt-4 text-lg text-[var(--textSecondary)]">
              Everything you need to book rooms with confidence.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              }
              title="Smart Matching Engine"
              description="Capacity, AV, and accessibility constraints are applied automatically to surface the best available room for your event."
              link="/book"
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              }
              title="Policy-Aware Recommendations"
              description="Recommendations respect university policies and room attributes so you book with confidence."
              link="/book"
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Availability Conflict Prevention"
              description="Double-booking is prevented by checking room availability against existing bookings before confirmation."
              link="/analytics"
            />
          </div>
        </div>
      </section>

      {/* Why RoomEase / Current vs RoomEase */}
      <section
        id="why"
        className="scroll-mt-24 border-t border-[var(--border)] py-24 sm:py-32"
        style={{ scrollMarginTop: `${NAVBAR_OFFSET}px` }}
      >
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              Why RoomEase
            </h2>
            <p className="mt-4 text-lg text-[var(--textSecondary)]">
              One platform instead of many.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold tracking-tight text-[var(--text)]">Current system</h3>
              <ul className="space-y-2 text-[var(--textSecondary)]">
                <li>Multiple booking portals</li>
                <li>Email-based requests</li>
                <li>No unified availability</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--primary)]/40 bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold tracking-tight text-[var(--primary)]">RoomEase</h3>
              <ul className="space-y-2 text-[var(--textSecondary)]">
                <li>Centralized catalog</li>
                <li>Real-time availability</li>
                <li>Smart recommendations & approval workflow</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* About section */}
      <section
        id="about"
        className="scroll-mt-24 border-t border-[var(--border)] py-24 sm:py-32"
        style={{ scrollMarginTop: `${NAVBAR_OFFSET}px` }}
      >
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
              About RoomEase
            </h2>
            <p className="mt-4 text-lg text-[var(--textSecondary)]">
              A capstone MVP for University of Waterloo room booking
            </p>
          </div>

          {/* Team Photo Card */}
          <div className="mb-12">
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md shadow-xl">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/team.jpg"
                  alt="RoomEase team"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Team Names */}
          <div className="mb-16">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {["Jey Jeyapalan", "Farhan Valli", "Pranav Gupta", "Kamal Ahsan", "Gurman Rai"].map((name) => (
                <div
                  key={name}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-all duration-200 hover:border-[var(--borderStrong)] hover:bg-[var(--surfaceElevated)]"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* Content Cards */}
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg">
              <h3 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--text)]">
                Who we are
              </h3>
              <p className="text-base leading-relaxed text-[var(--textSecondary)]">
                We're a team of University of Waterloo students building RoomEase as a capstone project. Our focus is a clean, UI-first booking experience that feels production-ready while keeping the logic intentionally simple for an MVP.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg">
              <h3 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--text)]">
                The problem we're solving
              </h3>
              <p className="text-base leading-relaxed text-[var(--textSecondary)]">
                Room bookings on campus can be fragmented and unclear. RoomEase centralizes event intake, recommends suitable rooms based on constraints, and confirms bookings in a single flow—while simulating availability and preventing double bookings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating section navigation */}
      <AnimatePresence>
        {showSectionNav && (
          <motion.nav
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-4 pointer-events-none"
            aria-label="Homepage section navigation"
          >
            <div className="pointer-events-auto relative overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surfaceElevated)]/92 px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="inline-flex items-center gap-1">
                {[
                  { id: "learn-more", label: "Learn More" },
                  { id: "why", label: "Why RoomEase" },
                  { id: "about", label: "About Us" },
                ].map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSectionClick(item.id as "learn-more" | "why" | "about")}
                      className={`rounded-full px-3.5 py-1.5 text-xs sm:text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[var(--primary)] text-[var(--primaryText)] shadow-sm"
                          : "text-[var(--textSecondary)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="absolute bottom-0 left-0 h-[2px] bg-[var(--primary)]/70 transition-[width] duration-150" style={{ width: `${scrollProgress * 100}%` }} />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="relative min-h-screen" />}>
      <HomePageContent />
    </Suspense>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md p-8 shadow-lg transition-all duration-200 hover:border-[var(--borderStrong)] hover:bg-[var(--surfaceElevated)] hover:shadow-xl hover:-translate-y-1"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)] transition-all duration-200 group-hover:border-[var(--primary)]/40 group-hover:bg-[var(--primary)]/15">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-[var(--text)]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--textSecondary)]">{description}</p>
    </Link>
  );
}
