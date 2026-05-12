# PT System Landing Page

Landing page for **ptsystem.ai**.

## Status

Phase 3 — Waitlist backend live (Neon Postgres + Resend).

## Tech Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, strict mode)
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) (Neutral base, CSS variables)
- [Inter](https://fonts.google.com/specimen/Inter) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) via `next/font`
- [Neon Postgres](https://neon.com) via `@vercel/postgres`
- [Resend](https://resend.com) for transactional email
- Deployed on [Vercel](https://vercel.com)

## Development 

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Environment variables

Set these in Vercel (project settings → Environment Variables) and locally
in `.env.local`:

| Var                     | Required | Notes                                                                                  |
| ----------------------- | -------- | -------------------------------------------------------------------------------------- |
| `POSTGRES_URL`          | yes      | Auto-set by the Neon-Vercel integration. Pooled connection string.                     |
| `RESEND_API_KEY`        | yes      | API key from the Resend dashboard.                                                     |
| `WAITLIST_NOTIFY_EMAIL` | yes      | Internal address that receives a notification on every signup.                         |
| `FROM_EMAIL`            | no       | Sender address. Defaults to `onboarding@resend.dev`. Set to `hello@ptsystem.ai` after the domain is verified in Resend. |

To pull Vercel env vars locally:

```bash
npx vercel env pull .env.local
```

## Database

Schema lives in `scripts/init-db.sql` (idempotent — safe to re-run).

```bash
npm run init-db
```

Or run the SQL directly in the Neon console.

## Domain

Production: [ptsystem.ai](https://ptsystem.ai)
