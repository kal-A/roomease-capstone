import { DEMO_CLUB_NAME } from "@/lib/userRole";

export type DemoMembership = {
  club_name: string;
  user_email: string;
  role_in_club: "member" | "executive";
  joined_at: string;
};

/** In-memory fallback when `club_memberships` is empty or unavailable */
export function getDemoMembershipsForEmail(email: string): DemoMembership[] {
  const e = email.trim().toLowerCase();
  const iso = "2025-09-01T12:00:00.000Z";
  if (e === "p37gupta@uwaterloo.ca") {
    return [{ club_name: DEMO_CLUB_NAME, user_email: e, role_in_club: "member", joined_at: iso }];
  }
  if (e === "g5rai@uwaterloo.ca") {
    return [{ club_name: DEMO_CLUB_NAME, user_email: e, role_in_club: "executive", joined_at: iso }];
  }
  if (e === "fvalli@uwaterloo.ca") {
    return [];
  }
  return [];
}

export function getDemoExecutiveForMemberEmail(memberEmail: string): string | null {
  const e = memberEmail.trim().toLowerCase();
  if (e === "p37gupta@uwaterloo.ca") return "g5rai@uwaterloo.ca";
  return null;
}
