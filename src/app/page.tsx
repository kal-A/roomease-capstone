"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function HomePageContent() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const scrollTo = searchParams.get("scrollTo");
    if (scrollTo) {
      // Small delay to ensure page is rendered
      setTimeout(() => {
        const element = document.getElementById(scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Clean up URL without scroll
          window.history.replaceState({}, "", "/");
        }
      }, 100);
    }
  }, [searchParams]);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-6 pt-24 pb-32 sm:px-8 sm:pt-32 sm:pb-40 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] sm:text-6xl lg:text-7xl" style={{ letterSpacing: "-0.02em" }}>
            Intelligent Room Booking
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-[rgba(255,255,255,0.65)] sm:text-2xl">
            Automated, policy-aware room recommendations in seconds.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/book"
              className="w-full rounded-full bg-[#FFD54A] px-8 py-4 text-center text-base font-semibold text-black shadow-lg transition-all duration-200 hover:bg-[#F6C445] hover:shadow-[#FFD54A]/25 hover:-translate-y-0.5 sm:w-auto"
            >
              Start Booking
            </Link>
            <Link
              href="/rooms"
              className="w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md px-8 py-4 text-center text-base font-semibold text-[rgba(255,255,255,0.92)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(17,17,19,0.85)] sm:w-auto"
            >
              Browse Rooms
            </Link>
            <a
              href="#learn-more"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById("learn-more");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-8 py-4 text-center text-base font-semibold text-[rgba(255,255,255,0.65)] transition-all duration-200 hover:border-[#FFD54A]/40 hover:text-[#FFD54A] sm:w-auto"
            >
              Learn More
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById("about");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-8 py-4 text-center text-base font-semibold text-[rgba(255,255,255,0.65)] transition-all duration-200 hover:border-[#FFD54A]/40 hover:text-[#FFD54A] sm:w-auto"
            >
              About Us
            </a>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section
        id="learn-more"
        className="scroll-mt-20 border-t border-[rgba(255,255,255,0.06)] py-24 sm:py-32"
      >
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-10">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] sm:text-4xl">
              Features
            </h2>
            <p className="mt-4 text-lg text-[rgba(255,255,255,0.65)]">
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

      {/* About section */}
      <section
        id="about"
        className="scroll-mt-20 border-t border-[rgba(255,255,255,0.06)] py-24 sm:py-32"
      >
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] sm:text-4xl">
              About RoomEase
            </h2>
            <p className="mt-4 text-lg text-[rgba(255,255,255,0.65)]">
              A capstone MVP for University of Waterloo room booking
            </p>
          </div>

          {/* Team Photo Card */}
          <div className="mb-12">
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md shadow-xl">
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
                  className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md px-5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.92)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(17,17,19,0.85)]"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* Content Cards */}
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-8 shadow-lg">
              <h3 className="mb-4 text-2xl font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">
                Who we are
              </h3>
              <p className="text-base leading-relaxed text-[rgba(255,255,255,0.65)]">
                We're a team of University of Waterloo students building RoomEase as a capstone project. Our focus is a clean, UI-first booking experience that feels production-ready while keeping the logic intentionally simple for an MVP.
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-8 shadow-lg">
              <h3 className="mb-4 text-2xl font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">
                The problem we're solving
              </h3>
              <p className="text-base leading-relaxed text-[rgba(255,255,255,0.65)]">
                Room bookings on campus can be fragmented and unclear. RoomEase centralizes event intake, recommends suitable rooms based on constraints, and confirms bookings in a single flow—while simulating availability and preventing double bookings.
              </p>
            </div>
          </div>
        </div>
      </section>
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
      className="group rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-8 shadow-lg transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(17,17,19,0.85)] hover:shadow-xl hover:-translate-y-1"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD54A]/30 bg-[#FFD54A]/10 text-[#FFD54A] transition-all duration-200 group-hover:border-[#FFD54A]/40 group-hover:bg-[#FFD54A]/15">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[rgba(255,255,255,0.65)]">{description}</p>
    </Link>
  );
}
