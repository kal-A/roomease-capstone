import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  const teamMembers = [
    "Jey Jeyapalan",
    "Farhan Valli",
    "Pranav Gupta",
    "Kamal Ahsan",
    "Gurman Rai",
  ];

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] sm:text-5xl lg:text-6xl" style={{ letterSpacing: "-0.02em" }}>
            About RoomEase
          </h1>
          <p className="mt-4 text-xl text-[rgba(255,255,255,0.65)]">
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
            {teamMembers.map((name) => (
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
          {/* Who we are */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">
              Who we are
            </h2>
            <p className="text-base leading-relaxed text-[rgba(255,255,255,0.65)]">
              We’re a team of University of Waterloo students building RoomEase as a capstone project. Our focus is a clean, UI-first booking experience that feels production-ready while keeping the logic intentionally simple for an MVP.
            </p>
          </div>

          {/* Problem we're solving */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,19,0.75)] backdrop-blur-md p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">
              The problem we’re solving
            </h2>
            <p className="text-base leading-relaxed text-[rgba(255,255,255,0.65)]">
              Room bookings on campus can be fragmented and unclear. RoomEase centralizes event intake, recommends suitable rooms based on constraints, and confirms bookings in a single flow—while simulating availability and preventing double bookings.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link
            href="/#features"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.65)] transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}
