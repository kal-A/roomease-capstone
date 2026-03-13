This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Authentication (NextAuth + Microsoft Entra ID)

RoomEase uses **NextAuth** with **Microsoft Entra ID (Azure AD)**. Access is restricted to **@uwaterloo.ca** accounts only.

### Azure App Registration

1. In [Azure Portal](https://portal.azure.com) go to **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name the app (e.g. "RoomEase"), choose **Accounts in this organizational directory only**, set Redirect URI:
   - **Web** → `http://localhost:3000/api/auth/callback/azure-ad` (for production, add `https://your-domain/api/auth/callback/azure-ad`).
3. After creation: **Overview** → copy **Application (client) ID** and **Directory (tenant) ID**.
4. **Certificates & secrets** → **New client secret** → copy the secret value (once only).

### Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret; generate with `openssl rand -base64 32` |
| `AZURE_AD_CLIENT_ID` | Application (client) ID from app registration |
| `AZURE_AD_CLIENT_SECRET` | Client secret value |
| `AZURE_AD_TENANT_ID` | Directory (tenant) ID (or leave empty for `common`) |

Do **not** commit `.env.local` or any file containing secrets (`.env*` is gitignored).

### Domain restriction

Only users with an email ending in **@uwaterloo.ca** can sign in. Others are rejected and redirected to a friendly error page asking them to use their University of Waterloo account.

---

## Getting Started

1. **Regenerate room data** from the Excel file (required for room list and building picker to match your data):
   ```bash
   yarn rooms:convert
   ```

2. **Run the development server:**
   ```bash
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Use **`/book`** for the booking flow.

   If you see Turbopack or route structure errors, clean and restart: `rm -rf .next && yarn dev`.

### Room data (Excel → JSON)

Room options are loaded from **`src/data/rooms.json`**. To regenerate this file from the Excel source:

1. **Where the data lives**
   - Input: **`src/data/Bookable Rooms.xlsx`**, sheet **"REG Rooms"**.
   - Output: **`src/data/rooms.json`** (used by the app at build and runtime).

2. **How to run the conversion**
   ```bash
   yarn rooms:convert
   ```
   The script logs total rooms found, rooms written, rooms skipped, and the output path.

3. **What the script does**
   - Reads the **REG Rooms** sheet, which has **two room tables side-by-side** (left and right columns).
   - For each row, extracts up to two rooms (from left and right blocks). Ignores "Furniture Legend" and junk rows.
   - **Building/room**: parses strings like `"RCH 305"` or `"AHS - 032A"` into `building` + `roomNumber`. Room id is `building-roomNumber`.
   - **Feature codes** (STC column): **SR** = AV capable, **D** = document camera; asterisks are ignored.
   - Output fields: `id`, `name`, `building`, `roomNumber`, `capacity`, `furniture`, `avCapable`, `docCamera`, `rawFeatureCode`, `accessible`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
