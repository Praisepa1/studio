# JobJet — Complete Repository Audit Report

> **Auditor roles**: Senior Software Architect · Principal Engineer · DevOps · Security Auditor · UI/UX Reviewer · Product Engineer  
> **Date**: 2026-06-26  
> **Repository**: `c:\Users\tochu\Documents\studio`  
> **Summarisation Mode**: Executive Summary + Key Points (source > 5,000 words across 15 phases)

---

## 1. Executive Summary

JobJet is an AI-powered job-search automation platform targeting freelancers and agencies. It uses **Next.js 15 (App Router)** on the frontend, **Firebase** for auth, **Google Genkit + Gemini** and **Anthropic Claude** as dual AI providers, and **Playwright** for Upwork scraping. The codebase is well-structured for an early-stage product: types are clean, the provider abstraction is solid, and the UI component system (shadcn/ui + Tailwind) is consistent.

However, the project has **several critical gaps** that must be closed before production launch: email/password authentication is mocked and never completes, the logout function does not call `signOut()`, there is no route protection (any unauthenticated user can reach `/dashboard`), API routes have no auth middleware, input validation is absent on all API endpoints, and Playwright is listed as a production dependency. The overall architecture is promising but sits at MVP/prototype stage rather than production-ready.

---

## 2. Repository Overview

| Property | Value |
|---|---|
| **Project Name** | JobJet (`package.json` name: `jobjet`) |
| **Version** | 0.2.0 |
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **UI** | shadcn/ui (Radix UI primitives) + Tailwind CSS 3 |
| **Auth** | Firebase Auth (Google OAuth implemented; email/password **mocked**) |
| **Database** | Firebase (auth only — no Firestore/RTDB used yet) |
| **AI Layer** | Google Genkit + Gemini 2.0 Flash + Anthropic Claude Opus |
| **Scraping** | Playwright (Chromium headless) |
| **State** | TanStack Query + React local state |
| **Deployment** | Firebase App Hosting (`apphosting.yaml`) |
| **Package Manager** | npm |
| **Build Tool** | Next.js (Turbopack for dev) |
| **Testing** | ❌ None |
| **CI/CD** | ❌ None |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  Next.js 15 App Router — React 18                               │
│                                                                  │
│  Landing (/)  →  Auth (/auth)  →  App Shell (AppShell)         │
│                                    ↓                            │
│  Dashboard | Upwork Gigs | Leads | Proposals | Outreach         │
│  AI Studio | Feedback | Scraping Jobs | Settings | Tools        │
│                                                                  │
│  UI: shadcn/ui (Radix) + Tailwind + Lucide Icons                │
│  Forms: React Hook Form + Zod                                   │
│  Data: TanStack Query + @tanstack-query-firebase                │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP (fetch)
┌─────────────────────────▼───────────────────────────────────────┐
│                     NEXT.JS API ROUTES                           │
│  /api/scrape/upwork     → scrapers/upwork.ts (Playwright)       │
│  /api/scrape/leads      → scrapers/leads.ts  (mock/stub)        │
│  /api/proposals/generate→ ai/providers/ (Gemini|Claude|Both)    │
│  /api/outreach/generate → ai/providers/ (Gemini|Claude|Both)    │
│  /api/research/gig      → enrichment/index.ts                   │
│  /api/research/lead     → enrichment/index.ts                   │
│  /api/feedback          → (records feedback)                     │
└──────┬─────────────────────────────────────────┬────────────────┘
       │                                         │
┌──────▼────────┐                    ┌───────────▼──────────────┐
│  AI LAYER     │                    │  SCRAPING LAYER           │
│               │                    │                           │
│  Genkit       │                    │  upwork.ts (Playwright)   │
│  (Gemini 2.0) │                    │  leads.ts  (stub)         │
│  Claude Opus  │                    │  scoring/index.ts         │
│  Dual-pipeline│                    │  enrichment/index.ts      │
└──────┬────────┘                    └──────────────────────────┘
       │
┌──────▼────────┐
│  FIREBASE     │
│  Auth only    │
│  (no DB yet)  │
└───────────────┘
```

---

## 4. Component Analysis

### 4.1 Authentication
- **File**: `src/app/auth/page.tsx`
- **Status**: ⚠️ **Partially Implemented**
- **Works**: Google OAuth via `signInWithPopup` — this is functional.
- **Broken**: Email/password handlers call `console.log` + a mock `setTimeout`. They never call Firebase `createUserWithEmailAndPassword` or `signInWithEmailAndPassword`.
- **Logout**: `handleLogout` in both `Sidebar` and `Header` only calls `router.push('/auth')`. Firebase `signOut()` is never called — session remains active.
- **Route protection**: Zero. Any unauthenticated visitor can navigate directly to `/dashboard`, `/proposals`, `/leads`, etc.

### 4.2 App Shell (`src/components/app-shell.tsx`)
- **Status**: ✅ **Good**
- Clean sidebar/header layout. Responsive: mobile overlay + desktop collapse. Active link detection works.
- Issue: Logout logic is duplicated between `Sidebar` and `Header` components.

### 4.3 AI Provider Layer (`src/ai/providers/`)
- **Status**: ✅ **Excellent design**
- Clean adapter pattern: `AIProviderAdapter` interface with `gemini.ts`, `claude.ts`, and `index.ts` orchestrating the pipeline.
- Dual-pipeline (Gemini → Claude) is well-implemented with a clear refinement prompt.
- `claude.ts` uses `require()` (CommonJS) inside an ESM file — minor inconsistency.
- Model name in `claude.ts` is `claude-opus-4-6` (hardcoded in two places).

### 4.4 Genkit Flows (`src/ai/flows/`)
- **Status**: 🟡 **Good but isolated**
- 4 flows: `smart-search`, `cover-letter-generator`, `profile-optimizer`, `resume-generator`.
- All use Zod schemas (excellent). All use Gemini only — the dual-provider layer is not used here.
- These flows appear to be the *original* Firebase Studio scaffolding and may not be fully connected to the frontend.

### 4.5 Upwork Scraper (`src/scrapers/upwork.ts`)
- **Status**: 🟡 **Needs Improvement**
- Well-structured with helper utilities (`parseMoney`, `parseUpworkBudget`, `parseRelativePostedTextToIso`).
- Falls back to demo mode gracefully.
- Issues:
  - Hardcoded `timezoneId: 'Africa/Lagos'` — should be configurable.
  - No proxy support — will be blocked in production quickly.
  - No pagination — only page 1.
  - `DEFAULT_TIMEOUT = 45s` with additional `delay(2500)` + `delay(2000)` → minimum ~10s per scrape.
  - Playwright is in `dependencies` not `devDependencies` — it ships to production unnecessarily.

### 4.6 Lead Scraper (`src/scrapers/leads.ts`)
- **Status**: ❌ **Stub/Demo Only**
- `runLiveScraper` is a skeleton that always returns demo data with error messages.
- Documented correctly (acknowledges LinkedIn TOS and recommends APIs), but not functional.

### 4.7 AI Enrichment (`src/enrichment/index.ts`)
- **Status**: ✅ **Good**
- Clean pipeline: calls prompts via `generateWithProvider`, parses JSON response.
- `JSON.parse(result.content)` will throw if the model returns non-JSON — the `catch` block silently swallows errors and returns a default, which is acceptable for resilience but loses error context.

### 4.8 Scoring (`src/scoring/index.ts`)
- **Status**: ✅ **Good**
- Heuristic scoring for gigs (budget, client history, description quality, skill match) and leads (profile richness, business need indicators, source quality).
- Dead code: `midBudget` computation is identical for both `fixed` and `hourly` types (lines 31-33 have the same formula for both branches).

### 4.9 Type System (`src/types/index.ts`)
- **Status**: ✅ **Excellent**
- Comprehensive, well-commented. All core domain types defined: `Gig`, `Lead`, `Proposal`, `OutreachMessage`, `FeedbackEntry`, `ScrapingJob`, `DashboardStats`.
- Clean union types for status, style, channel, tone enums.

### 4.10 API Routes
- **Status**: ⚠️ **Missing auth & validation**
- `/api/scrape/upwork`: No auth, no rate limiting, no input sanitization.
- `/api/proposals/generate`: No auth, `body` fields have no validation.
- `/api/outreach/generate`: Same issues.
- Anyone with the URL can call these endpoints freely, triggering AI API calls at your cost.

### 4.11 Mock Data (`src/lib/mock-data.ts`)
- **Status**: 🟡 **Needs extraction**
- 277 lines of hardcoded demo gigs and leads. Should eventually be a seeding script, not bundled in production.

### 4.12 Dashboard (`src/app/dashboard/page.tsx`)
- **Status**: 🟡 — Uses mock stats, no real data from Firebase.

---

## 5. Issues Found

### 🔴 Critical

| # | Issue | Location |
|---|---|---|
| C1 | Email/password auth is mocked — no real Firebase auth | `auth/page.tsx:82-96` |
| C2 | `signOut()` never called on logout — session persists | `app-shell.tsx:119-124, 244-248` |
| C3 | Zero route protection — unauthenticated users can access all pages | All app routes |
| C4 | API routes have no authentication middleware | `api/*/route.ts` |
| C5 | No input validation on API routes — no Zod, no sanitization | `api/*/route.ts` |

### 🟠 High

| # | Issue | Location |
|---|---|---|
| H1 | No rate limiting on AI/scrape endpoints — cost exposure | `api/proposals`, `api/outreach`, `api/scrape` |
| H2 | Playwright in `dependencies` not `devDependencies` — ships to prod | `package.json:50` |
| H3 | Hardcoded `Africa/Lagos` timezone in browser context | `scrapers/upwork.ts:288` |
| H4 | Upwork scraper has no proxy configuration — will be IP-blocked | `scrapers/upwork.ts` |
| H5 | `error: any` typing in auth page leaks type safety | `auth/page.tsx:110` |
| H6 | `ignoreBuildErrors: true` — build never catches TypeScript errors | `next.config.ts:6` |

### 🟡 Medium

| # | Issue | Location |
|---|---|---|
| M1 | Logout handler duplicated across `Sidebar` and `Header` | `app-shell.tsx` |
| M2 | `require()` (CJS) inside ESM file in `claude.ts` | `providers/claude.ts:6` |
| M3 | Model name `claude-opus-4-6` hardcoded in 2 places | `providers/claude.ts:12,21` |
| M4 | Dead code in `scoreGig`: identical formula in both branches of if/else | `scoring/index.ts:31-33` |
| M5 | `JSON.parse` on AI responses with no structured output enforcement | `enrichment/index.ts:59,111` |
| M6 | Privacy/Terms links are `href="#"` placeholders | `app/page.tsx:242-243` |
| M7 | No database integration — all data is session/local state only | Global |
| M8 | No pagination in Upwork scraper — only first page results | `scrapers/upwork.ts` |
| M9 | `update` package in dependencies serves no obvious purpose | `package.json:58` |

### 🔵 Low

| # | Issue | Location |
|---|---|---|
| L1 | `console.log` left in auth page with credentials | `auth/page.tsx:81,91` |
| L2 | `AvatarImage src=""` — empty string, always falls back | `app-shell.tsx:290` |
| L3 | `Bell` notification icon has no actual notification system | `app-shell.tsx:281-284` |
| L4 | `maxInstances: 1` in apphosting — production bottleneck | `apphosting.yaml:7` |
| L5 | README.md is 4 lines with no useful information | `README.md` |

---

## 6. Phase-by-Phase Review

### Phase 3 — Code Quality

| Module | Rating | Notes |
|---|---|---|
| `src/types/index.ts` | **Excellent** | Complete, clean, well-commented |
| `src/ai/providers/` | **Excellent** | Solid adapter pattern |
| `src/scoring/index.ts` | **Good** | Clear heuristics, minor dead code |
| `src/enrichment/index.ts` | **Good** | Clean pipeline, catch swallows context |
| `src/components/app-shell.tsx` | **Good** | Minor duplication |
| `src/scrapers/upwork.ts` | **Good** | Well-structured, needs proxy/pagination |
| `src/lib/mock-data.ts` | **Needs Improvement** | 277 lines of hardcoded data in lib/ |
| `src/app/auth/page.tsx` | **Poor** | Mock auth, no Firebase integration, `console.log` of credentials |
| `src/app/api/*/route.ts` | **Poor** | No auth, no validation, no rate limiting |

### Phase 4 — Architecture

| Principle | Status | Notes |
|---|---|---|
| SOLID | 🟡 Partial | Provider adapter (S, O, D good). Pages mix data-fetching + UI (S violation). |
| DRY | 🟡 Partial | Logout duplicated. `midBudget` formula duplicated. |
| Clean Architecture | 🟡 Partial | Good layer separation (providers, scrapers, enrichment). Pages reach across layers. |
| Modular Design | ✅ Good | Clear modules: `ai/`, `scrapers/`, `enrichment/`, `scoring/`, `types/` |
| Scalability | ❌ Missing | No DB persistence, 1 server instance, no queue for scraping |

### Phase 5 — Frontend

| Aspect | Status | Notes |
|---|---|---|
| Component Organization | 🟡 Minimal — only `AppShell` + shadcn/ui in `components/` |
| Responsiveness | ✅ Good — sidebar mobile/desktop handled |
| Accessibility | 🟡 Partial — labels on form fields, missing `aria-live` for loading states |
| Styling Consistency | ✅ Good — Tailwind + design tokens |
| State Management | 🟡 Local state + TanStack Query. No persistent store. |
| Performance | ✅ Good — Turbopack dev, no obvious N+1 on client |
| Testing | ❌ None |

### Phase 6 — Backend (API Routes)

| Aspect | Status |
|---|---|
| Auth middleware | ❌ None |
| Input validation | ❌ None |
| Error handling | 🟡 Basic try/catch with message |
| Logging | 🟡 `console.error` only |
| Rate limiting | ❌ None |
| Security | ❌ Open to public |

### Phase 7 — Database

- **Current**: Firebase Auth only. No Firestore, no Realtime DB, no external DB.
- **Data persistence**: Zero. All gigs, leads, proposals, outreach, feedback exist only in component state per session.
- **Recommendation**: Firestore is already imported as a dependency area; integrate it for `gigs`, `leads`, `proposals`, `outreach`, `feedback` collections with user-scoped security rules.

### Phase 8 — Security Audit

| Issue | Severity | Mitigation |
|---|---|---|
| Email/password auth is a mock — credentials collected but not validated | **Critical** | Implement `signInWithEmailAndPassword` + `createUserWithEmailAndPassword` |
| `signOut()` never called — session persists after "logout" | **Critical** | Call `auth.signOut()` before routing |
| No auth on API routes — free AI API use by anyone | **Critical** | Add Firebase ID token verification middleware |
| `console.log("Login data:", data)` — logs email + password to console | **High** | Remove `console.log` statements containing credentials |
| `error: any` in auth handler — bypasses type safety | **High** | Type as `FirebaseError` or `unknown` |
| `ignoreBuildErrors: true` — TypeScript errors silently pass build | **High** | Remove; fix underlying type errors |
| No CSRF protection on API routes | **Medium** | Add `sameSite` cookies; use Firebase token in Authorization header |
| `update` mystery dependency | **Low** | Audit and remove if unused |

### Phase 9 — Performance

| Issue | Impact | Fix |
|---|---|---|
| Upwork scrape: `delay(2500) + delay(2000) + scroll` = ~10s minimum | High | Parallelize; reduce delays; use headless browser pool |
| No caching on AI-generated enrichments | High | Cache enrichment in Firestore by gig ID |
| `JSON.parse` on raw AI output — no retry if malformed | Medium | Use Genkit structured output or retry loop |
| `mock-data.ts` (17KB) bundled client-side | Low | Move to server-only or seeding script |
| Playwright browser startup on every scrape request | High | Reuse browser instances; use a queue/worker |

### Phase 10 — DevOps

| Area | Status | Note |
|---|---|---|
| Docker | ❌ None | No Dockerfile |
| CI/CD | ❌ None | No GitHub Actions |
| Monitoring | ❌ None | No error tracking (Sentry, etc.) |
| Environment | 🟡 `.env` / `.env.local` | Not validated on startup |
| Deployment | ✅ Firebase App Hosting | Simple but `maxInstances: 1` |
| Logging | 🟡 `console.error` only | No structured logging |

### Phase 11 — Testing

- **Current**: Zero test files. No test runner configured.
- **Framework**: No Jest, Vitest, Playwright test config.
- **Coverage**: 0%.

### Phase 12 — Documentation

| Document | Status |
|---|---|
| README.md | ❌ 4 lines, useless |
| CLAUDE.md | ✅ Good dev guide for AI assistants |
| API docs | ❌ None |
| Code comments | 🟡 Good in scrapers/providers, sparse elsewhere |
| Architecture doc | ❌ None (CLAUDE.md is the closest) |

---

## 7. Improvement Roadmap

### Critical — Fix Before Any Users

| Issue | Why It Matters | Difficulty | Time |
|---|---|---|---|
| Implement email/password Firebase auth | Auth is broken — users cannot register/login | Easy | 1–2h |
| Call `signOut()` on logout | Active sessions never terminate | Easy | 30min |
| Add route protection middleware | All pages are publicly accessible | Easy | 2h |
| Add auth middleware to all API routes | AI/scrape APIs are publicly callable at your expense | Medium | 3–4h |
| Remove `console.log` of credentials | Security vulnerability | Easy | 15min |

### High Priority — Before Feature Work

| Issue | Why It Matters | Difficulty | Time |
|---|---|---|---|
| Integrate Firestore for data persistence | App loses all data on refresh | Medium | 1–2 days |
| Add input validation (Zod) on API routes | No guard against malformed/malicious input | Easy | 3–4h |
| Add rate limiting to AI endpoints | Prevents abuse and runaway costs | Medium | 2–3h |
| Move Playwright to devDependencies or server worker | Reduces production bundle | Easy | 30min |
| Remove `ignoreBuildErrors: true` | TypeScript errors go undetected in CI | Medium | 2–3h |
| Add proxy configuration to Upwork scraper | IP blocking in production | Hard | 1–2 days |

### Medium Priority — Maintainability

| Issue | Difficulty | Time |
|---|---|---|
| Extract logout logic to a shared hook | Easy | 1h |
| Enforce structured JSON output in enrichment | Medium | 2h |
| Add pagination to Upwork scraper | Medium | 2–3h |
| Replace `require()` with `import()` in claude.ts | Easy | 30min |
| Move mock-data.ts to server-only or seed script | Easy | 1h |

### Low Priority — Polish

| Issue | Difficulty | Time |
|---|---|---|
| Implement notification system for Bell icon | Medium | 1 day |
| Connect Avatar image to Firebase user profile | Easy | 1h |
| Add Privacy/Terms pages | Easy | 2h |
| Increase `maxInstances` in apphosting.yaml | Easy | 10min |
| Write README.md | Easy | 1h |

---

## 8. Refactoring Opportunities

1. **Extract `useAuth` hook** — centralize Firebase auth state (`currentUser`, `signIn`, `signOut`, `signUp`) into a single hook used by pages and the shell.
2. **Create API middleware** — a reusable `withAuth()` wrapper for all route handlers that verifies Firebase ID tokens.
3. **Extract `useLogout` hook** — eliminates the duplicated logout logic between `Sidebar` and `Header`.
4. **Config constants file** — `DEFAULT_TIMEOUT`, `DEFAULT_MAX_AGE_HOURS`, model names, etc. should live in a single `src/config/constants.ts`.
5. **Separate page-level data fetching** — pages currently mix data fetching, business logic, and rendering. Extract data fetching into custom hooks.
6. **Fix scoring dead code** — the `midBudget` calculation repeats identically; refactor into one line before the `if (budget.type === 'hourly')` branch.
7. **Rename `mock-data.ts`** to `seeds/demo-data.ts` and make server-only.

---

## 9. Security Findings Summary

| Severity | Count | Top Items |
|---|---|---|
| Critical | 3 | Mocked auth, no signOut, no API auth |
| High | 3 | Credential logging, `any` typing, build error suppression |
| Medium | 2 | No CSRF, no input validation |
| Low | 2 | Mystery dependency, trivial style issues |

---

## 10. Production Readiness Assessment

**Current status: Not production-ready.**

The app is a well-architected MVP prototype. The AI provider layer, type system, and UI shell are genuinely good work. However, the authentication is partially unimplemented, data persistence is absent, and security controls on the API layer are missing entirely. No user data would survive a page refresh, and any person who discovers the API URL can run AI generations at the owner's expense.

**Estimated effort to production-ready**: 3–5 days of focused work on the critical and high priority items above.

---

## 11. Final Scorecard

| Dimension | Score | Notes |
|---|---|---|
| **Architecture** | 6/10 | Good layer design, but no DB and no persistence |
| **Code Quality** | 6/10 | Excellent in AI/scoring/types, Poor in auth/API |
| **Maintainability** | 6/10 | Good structure, but no tests and broken auth |
| **Security** | 2/10 | Critical gaps: no auth middleware, mocked login |
| **Performance** | 5/10 | Scraper is slow; AI caching absent; bundling OK |
| **Scalability** | 3/10 | 1 instance, no DB, no queue, no caching |
| **Readability** | 7/10 | Types + comments good; pages could be cleaner |
| **Documentation** | 4/10 | CLAUDE.md is good; README is useless |
| **Testing** | 0/10 | Zero tests |
| **Developer Experience** | 7/10 | Good scripts, Turbopack, CLAUDE.md |
| **Production Readiness** | 2/10 | Auth broken, no DB, no CI/CD, no monitoring |
| | | |
| **Overall Score** | **4.4 / 10** | Strong foundation; critical gaps must be fixed |

---

*Report generated by Antigravity audit · Summarisation Mode: Executive Summary + Key Points*
