# Dependency security notes

Last reviewed: 2026-09-26

## Phase 1 maintenance result

- Next.js was upgraded from 16.1.6 to 16.3.6.
- NextAuth was upgraded from 4.24.13 to 4.24.15.
- `eslint-config-next` was kept aligned with Next.js at 16.3.6.
- Compatible transitive fixes were applied with `npm audit fix --package-lock-only`; no forced or semver-major audit fix was used.
- `npm audit --omit=dev` reports zero production vulnerabilities.
- The full development dependency graph reports one high-severity advisory: `xlsx@0.18.5`.

## XLSX scoped exception

The npm registry offers no fixed version for the advisories affecting `xlsx@0.18.5`. RoomEase uses this package only in `scripts/convertRoomsToJson.js` to convert the repository-owned `src/data/Bookable Rooms.xlsx` workbook into JSON. It is not imported by the Next.js application, API routes, or production runtime.

Controls:

- `xlsx` is a development dependency.
- The conversion script accepts its source path from repository code; RoomEase does not parse uploaded or network-supplied workbooks.
- The conversion command is not run during application startup, build, or deployment.
- Contributors must treat replacement workbooks as trusted source artifacts and review them before running the converter.
- This exception must be reviewed whenever the converter or workbook ingestion behavior changes, or when a maintained fixed package becomes available.

This is a documented risk acceptance, not a claim that the package is vulnerability-free.
