# RoomEase configuration

RoomEase uses Microsoft Entra ID (Azure AD) for authentication and Supabase for persistence. Copy `.env.example` to `.env.local` and provide values for the environment you are running. Never commit `.env.local` or a service-role key.

## Supported toolchain

- Node.js 24.x
- npm 11.x

Install dependencies with `npm ci`. npm is the repository's lockfile owner; Yarn is not supported for this checkout.

## Authentication variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXTAUTH_URL` | Server | Canonical application URL, such as `http://localhost:3000`. |
| `NEXTAUTH_SECRET` | Server secret | Signs/encrypts NextAuth state and sessions. Use a long random value. |
| `AZURE_AD_CLIENT_ID` | Server | Entra application/client identifier. |
| `AZURE_AD_CLIENT_SECRET` | Server secret | Entra client credential. |
| `AZURE_AD_TENANT_ID` | Server | Tenant identifier; configure this explicitly rather than relying on a shared tenant. |

Register this local redirect URI in the Entra application:

```text
http://localhost:3000/api/auth/callback/azure-ad
```

For a deployment, register the equivalent HTTPS callback under the production host. The application accepts only authenticated email addresses ending in `@uwaterloo.ca`; tenant and account policy must still be configured correctly in Entra.

## Supabase variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Browser-safe | Preferred public/publishable key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe | Legacy fallback when the project does not provide the publishable-key name. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Privileged API key used only by server route handlers. Bypasses RLS. |

The service-role key must never use a `NEXT_PUBLIC_` prefix. The current repository does not yet contain a complete reproducible Supabase schema; see `engineering-hardening-plan.md` before attempting to create a fresh project.

## Identity and demo controls

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `ROOM_EASE_ADMIN_EMAILS` | Server | Comma-separated administrator email allowlist. |
| `ROOM_EASE_DEMO_MODE` | Server | Explicitly enables configured demo identity behavior outside production. |
| `ROOM_EASE_DEMO_MEMBER_EMAIL` | Server | Optional demo member identity. |
| `ROOM_EASE_DEMO_EXECUTIVE_EMAIL` | Server | Optional demo executive identity. |
| `ROOM_EASE_ALLOW_DEMO_SEED` | Server | Additional acknowledgement required before demo data may be mutated. |

Demo mode and demo seeding are rejected when `NODE_ENV=production`. These variables are intentionally not public browser variables.

## Local startup

1. Install Node 24 and npm 11 (`.nvmrc` contains the Node major version).
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and populate the required values.
4. Run `npm run dev`.
5. Open `http://localhost:3000` and authenticate through the configured Entra application.

Before opening a pull request, run:

```text
npm run lint
npm run typecheck
npm run build
```

Lint is a known Phase 2 gate and is not yet green at the end of the Phase 0 baseline.
