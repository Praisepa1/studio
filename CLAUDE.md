# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server with Turbopack on port 9002
npm run genkit:dev   # Start Genkit AI dev server
npm run genkit:watch # Start Genkit in watch mode

# Build & Quality
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript type check (tsc --noEmit)
```

## Architecture

**JobJet** is an AI-powered job search automation app built with Next.js 15 (App Router) + Firebase + Genkit.

### Key Layers

**Pages** (`src/app/`) — Next.js App Router. Each feature has its own route:
- `/auth` — Firebase Auth (email/password + Google OAuth)
- `/smart-search`, `/resume-generator`, `/cover-letter-generator`, `/profile-optimizer` — AI-powered tools
- `/automated-application`, `/settings` — utility pages

**AI Flows** (`src/ai/flows/`) — Genkit server actions called from pages. All flows use Zod input/output schemas and the `googleai/gemini-2.0-flash` model configured in `src/ai/genkit.ts`. The dev entry point (`src/ai/dev.ts`) imports all flows for the Genkit dev UI.

**App Shell** (`src/components/app-shell.tsx`) — Wraps all pages with a collapsible sidebar nav, user avatar/dropdown, and logout logic.

**Firebase** (`src/lib/firebase.ts`) — Initializes Firebase app + Auth from environment variables. Data fetching uses `@tanstack/react-query` with `@tanstack-query-firebase/react`.

**UI** (`src/components/ui/`) — shadcn/ui components (Radix UI primitives + Tailwind). Forms use React Hook Form + Zod resolvers.

### Environment Variables

Firebase config and Google AI API key are loaded from `.env` / `.env.local`. See Firebase console for values.

### Important Config Notes

- `next.config.ts` ignores TypeScript and ESLint errors during builds and adds a webpack alias for `async_hooks` (required for Genkit/OpenTelemetry compatibility).
- Path alias `@/*` maps to `./src/*`.
- Deployed via Firebase App Hosting (`apphosting.yaml`).
