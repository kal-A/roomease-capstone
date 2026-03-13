import clubs from "@/data/clubs.json";

/**
 * Build a clean, sorted list of club names from the raw JSON.
 * - trims whitespace
 * - removes duplicates
 * - filters out obviously invalid/non-club entries
 * - sorts alphabetically
 */
export function getClubNames(): string[] {
  const rawNames =
    Array.isArray(clubs) && clubs.length > 0
      ? clubs
          .map((c: any) => (typeof c?.name === "string" ? c.name.trim() : ""))
          .filter((name) => name.length > 0)
      : [];

  const EXPLICIT_EXCLUDE = new Set<string>(["200 University Avenue West"]);

  const isLikelyValidClubName = (name: string): boolean => {
    if (EXPLICIT_EXCLUDE.has(name)) return false;

    // Must contain at least one letter
    if (!/[A-Za-z]/.test(name)) return false;

    // Very short names are likely noise (e.g., "A", "B")
    if (name.length < 3) return false;

    return true;
  };

  const unique = new Set<string>();

  for (const name of rawNames) {
    if (!isLikelyValidClubName(name)) continue;
    unique.add(name);
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

