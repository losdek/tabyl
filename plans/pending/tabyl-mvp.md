# Tabyl — classifieds marketplace (Lalafo-class, faster, better designed)
Ticket: none (personal project). Plan approved: _pending_

Tabyl («Табыл», Kyrgyz for "find") is a Russian-language classifieds marketplace for
Kyrgyzstan (prices in сом, cities Бишкек/Ош/…), built to beat Lalafo on speed and design.

## Success criteria (measurable)
- **Fast:** LCP < 1.5 s and INP < 200 ms on Lighthouse mobile (Slow 4G, 4× CPU) for home,
  search and ad pages; first-load JS on the home page ≤ 120 KB gzipped; search results
  update ≤ 150 ms after typing stops (server time, local DB).
- **Design:** studio-grade look (per the `ru-web-design` skill), mobile-first, light + dark
  theme, correct Russian typography («ёлочки», тире, неразрывные пробелы, `12 500 сом`),
  WCAG AA contrast.
- **Works end-to-end locally:** a Playwright suite covering sign-in → post ad → find it
  in search → favourite → chat → review → promote (Freedom Pay test mode) → report →
  moderate, all green.

## Stack
| Layer | Choice |
| --- | --- |
| App | Next.js (App Router, latest stable at install), TypeScript, React Server Components |
| Styling | Tailwind CSS + CSS-variable design tokens; self-hosted Cyrillic fonts |
| DB | Postgres via **PGlite** (embedded, local file) through **Drizzle ORM**; `postgres-js` driver at deploy |
| Search | Postgres full-text search (`russian` config) + `pg_trgm` for typos/prefixes |
| Auth | Own session cookies; phone + 6-digit code (printed to the terminal locally); Google via OAuth (Arctic) when keys exist |
| Photos | `sharp` → AVIF + WebP at 3 widths + blur placeholder; stored in `./storage` locally |
| Chat | Server-Sent Events + in-process pub/sub (Postgres LISTEN/NOTIFY at deploy) |
| Payments | Freedom Pay (ex-PayBox) adapter, test mode; local stub simulates callbacks until keys are in `.env` |
| Tests | Vitest (units), Playwright (e2e), Lighthouse CI (perf budget) |

## Phases

### Phase 0: Foundation + risk spike
Verified when: `npm run check` (typecheck + lint + vitest) is green, the spike proves
PGlite + Drizzle + Russian FTS + pg_trgm work, and the empty shell scores LCP < 1.0 s.
Files to touch: `package.json`, `drizzle.config.ts`, `src/db/*`, `src/app/layout.tsx`,
`src/styles/*`, `tests/*`, `lighthouserc.json`

#### Step 0.1: DB spike (Size: S)
- Acceptance: PGlite DB with `pg_trgm`; `to_tsvector('russian','продаю велосипеды')` matches the query `велосипед`; trigram matches `айфон` ≈ `айфн`.
- Verification command: `npm run test -- db.spike`
- Files: `src/db/client.ts`, `tests/db.spike.test.ts`
- Test seams: DB client
- Blocked by: none

#### Step 0.2: Scaffold + tooling (Size: S)
- Acceptance: Next.js app boots; ESLint, Prettier, Vitest, Playwright, Lighthouse CI wired; `npm run check` green.
- Verification command: `npm run check && npm run build`
- Blocked by: 0.1

#### Step 0.3: UI directions — USER PICKS (Size: M)
- Acceptance: 3 clearly different design directions (per `ru-web-design`), each shown as the same 4 phone screens (home, search results, ad page, chat) plus a laptop view of home, in light + dark, on one comparison page. **The user chooses one (or mixes parts); building waits for that choice.** This is a planned pause the user asked for, not a mid-stream question.
- Verification command: user's choice recorded in the decision log
- Files: `design/directions/*`
- Blocked by: none (runs in parallel with 0.1–0.2)

#### Step 0.4: Design system from the chosen direction (Size: M)
- Acceptance: tokens (colour, type scale, spacing, radius) in light/dark, exported both as CSS variables and as a JSON file the Android app reuses; core components (Button, Input, Select, Card, Badge, Sheet, Toast, Price, Avatar); typography helpers (`formatPrice`, `formatPhone`, `typograf`).
- Verification command: `npm run check` + `/design` page screenshot review
- Files: `src/ui/*`, `src/lib/format.ts`, `src/app/design/page.tsx`, `design/tokens.json`
- Blocked by: 0.2, 0.3

### Phase 1: Accounts
Verified when: e2e `auth.spec.ts` signs in by phone code, persists the session, and signs out; the Google button is hidden without keys and the redirect is built correctly with test keys.

#### Step 1.1: Schema + phone code sign-in (Size: M)
- Acceptance: `users`, `sessions`, `login_codes` tables; code is rate-limited (5 / hour / phone, 5 tries / code), hashed, expires in 5 min; httpOnly secure session cookie.
- Verification command: `npm run test -- auth && npx playwright test auth`
- Files: `src/db/schema/users.ts`, `src/server/auth/*`, `src/app/(auth)/*`
- Blocked by: 0.4

#### Step 1.3: Mobile API foundation (Size: S)
- Acceptance: versioned JSON API at `/api/v1` sharing the same server functions as the website (no duplicate logic); bearer-token sessions for apps alongside web cookies; OpenAPI spec generated from Zod schemas at `/api/v1/openapi.json`. Every later phase adds its endpoints here in the same slice as its web UI.
- Verification command: `npm run test -- api`
- Files: `src/app/api/v1/*`, `src/server/api/*`
- Blocked by: 1.1

#### Step 1.2: Google OAuth + profile settings (Size: S)
- Acceptance: Google sign-in links to an existing phone account or creates one; profile name/avatar/city editable.
- Verification command: `npx playwright test profile`
- Blocked by: 1.1

### Phase 2: Posting ads (vertical slice: schema → server action → UI)
Verified when: e2e `post-ad.spec.ts` posts an ad with 3 photos and sees it on its own page.

#### Step 2.1: Categories + attribute schemas (Size: S)
- Acceptance: category tree (Транспорт, Недвижимость, Электроника, Работа, Услуги, Дом и сад, Одежда, Детям, Животные, Хобби); per-category attributes (e.g. Транспорт: марка, год, пробег, КПП) as typed JSON schema, used by both the form and the filters.
- Files: `src/domain/categories.ts`, `src/db/schema/ads.ts`
- Blocked by: 1.1

#### Step 2.2: Photo pipeline (Size: S)
- Acceptance: up to 10 photos per ad, ≤ 15 MB each, EXIF stripped, AVIF/WebP at 320/640/1280, blur placeholder; uploaded with a progress bar, reorderable.
- Verification command: `npm run test -- images`
- Blocked by: 0.2

#### Step 2.3: Create / edit / close ad + ad page (Size: M)
- Acceptance: multi-step form with draft autosave; ad page with gallery, price, attributes, seller card, "Показать телефон" (masked until clicked, logged); edit, mark sold, delete.
- Verification command: `npx playwright test post-ad`
- Blocked by: 2.1, 2.2

### Phase 3: Browse + search
Verified when: e2e `search.spec.ts` finds an ad by a typo'd word, filters by city + price + one attribute, and Lighthouse passes the budget on `/`, `/search`, `/ad/[id]`.

#### Step 3.1: Home + category feeds (Size: M)
- Acceptance: home with category grid + fresh ads; category page; cursor pagination (infinite scroll with real links); ads streamed from server components.
- Blocked by: 2.3

#### Step 3.2: Search + filters (Size: M)
- Acceptance: one search box with instant suggestions (FTS + trigram); filters: city, price range, condition, with-photo, category attributes; sort by new / price; filters live in the URL (shareable, back button works).
- Verification command: `npx playwright test search && npm run lhci`
- Blocked by: 3.1

### Phase 4: Favourites + seller pages (Size: S)
Verified when: `npx playwright test favorites` passes; a saved-search alert lists new matches on next visit.
- Acceptance: heart on any ad card; "Избранное" page; public seller page with their active ads, member since, response rate; saved searches.
- Blocked by: 3.2

### Phase 5: Chat
Verified when: `npx playwright test chat` — two browser contexts exchange messages live, unread counts update, a photo message arrives.

#### Step 5.1: Conversations + messages (Size: M)
- Acceptance: one thread per (ad, buyer); text + photo messages; SSE live updates; unread badges; seller quick replies ("Ещё актуально?"); block user.
- Blocked by: 2.3

### Phase 6: Ratings + reviews (Size: S)
Verified when: `npx playwright test reviews` passes.
- Acceptance: a buyer may review a seller only after a chat thread with ≥ 1 reply from each side; 1–5 stars + text; seller can answer once; average shown on seller card.
- Blocked by: 5.1

### Phase 7: Promoted ads + Freedom Pay
Verified when: `npx playwright test promote` buys a tier through the test-mode flow, the callback is signature-checked, and the ad appears in the top block with a badge until expiry.

#### Step 7.1: Promotion domain (Size: S)
- Acceptance: tiers (Поднять в ленте / ТОП на 3 дня / ТОП на 7 дней / VIP), prices in сом; `orders` and `promotions` tables; expiry job; promoted ads mixed into feeds at fixed slots (not taking over results).
- Blocked by: 3.2

#### Step 7.2: Freedom Pay adapter (Size: M)
- Acceptance: create payment (test mode), redirect, result + check callbacks with signature verification, idempotent order state machine (`created → pending → paid | failed | refunded`); a local stub implements the same callbacks when keys are absent.
- Verification command: `npm run test -- payments && npx playwright test promote`
- Blocked by: 7.1

### Phase 8: Moderation + admin
Verified when: `npx playwright test moderation` — a reported ad is hidden after admin action, a banned user can't sign in, and the audit log records both.

#### Step 8.1: Reports + auto-checks (Size: S)
- Acceptance: "Пожаловаться" on ads, users, messages with reasons; automatic flags (banned words, phone numbers in the description, duplicate photos by perceptual hash).
- Blocked by: 2.3, 5.1

#### Step 8.2: Admin panel (Size: M)
- Acceptance: `/admin` (role-gated): moderation queue, approve/reject with reason (seller notified), ban/unban users, orders list with refunds, audit log.
- Blocked by: 8.1, 7.2

### Phase 9: Speed + polish pass
Verified when: `npm run lhci` meets every budget on all main pages; full Playwright suite green; accessibility audit has no AA failures.
- Acceptance: performance profiling and fixes, empty/loading/error states everywhere, dark-theme review, 404/500 pages, SEO (meta, OG images, sitemap, JSON-LD `Product`), deploy guide (`docs/deploy.md`) for Vercel + Supabase + Freedom Pay live keys + SMS provider + Google keys.
- Blocked by: 4, 6, 8.2

---

## Part B — Android app (Kotlin Multiplatform), iOS later

Starts after the website's Phase 9. Same backend (`/api/v1`), same design tokens, same
Russian copy. Code lives in `mobile/` in this repo.

| Layer | Choice |
| --- | --- |
| Project | Kotlin Multiplatform; `shared` module (API client, models, auth, repositories, view-models) + `androidApp`; `iosApp` target declared but not built until a Mac is available |
| UI | Compose Multiplatform, Material 3 themed from `design/tokens.json` |
| Network | Ktor client + kotlinx.serialization, generated from the OpenAPI spec |
| Storage | SQLDelight cache (offline browsing of viewed ads/favourites), DataStore for the token |
| Images | Coil 3 (requests the AVIF/WebP sizes the server already makes) |
| Push | Firebase Cloud Messaging for chat messages — needs a Firebase project from the user at deploy; locally falls back to polling |
| Tests | kotlin.test (shared), Compose UI tests on an emulator |

### Phase 10: Android toolchain + shell (Size: M)
Verified when: `./gradlew :androidApp:assembleDebug` builds, and the app launches on the emulator showing the home feed from the local server.
- Acceptance: JDK + Android SDK installed under the user's home (no sudo); KMP project; theme from tokens; bottom navigation (Главная, Поиск, Подать, Чаты, Профиль).
- Blocked by: 9

### Phase 11: Android sign-in, browse, search, ad page (Size: M)
Verified when: Compose UI tests `SignInTest`, `SearchTest` pass on the emulator.
- Blocked by: 10

### Phase 12: Android posting (camera/gallery, compression before upload), favourites, profile (Size: M)
Verified when: `PostAdTest` passes; an ad posted from Android appears on the website.
- Blocked by: 11

### Phase 13: Android chat, reviews, promotion (Freedom Pay in a Custom Tab), reports (Size: M)
Verified when: a chat between the website and the Android app works live; `PromoteTest` passes in test mode.
- Blocked by: 12

### Phase 14: Android polish + release build (Size: S)
Verified when: signed release APK/AAB builds; cold start < 1 s on the emulator (Baseline Profiles); dark theme reviewed.
- Blocked by: 13

### Later (not this build): iOS
The `iosApp` target already exists in the shared code. When a Mac (or a macOS CI runner)
is available: build `iosApp`, adjust platform bits (photo picker, payments sheet, APNs),
and test on an iPhone.

## Decision log
| Decision | Chosen option | Why |
| --- | --- | --- |
| Scope | MVP + extras (ratings, promotion, moderation) | User choice |
| Market | Russian UI, Kyrgyzstan, сом | User choice; Lalafo's home market |
| Hosting | Local first; deploy only on request | User choice |
| Local DB | PGlite + Drizzle | No Docker/Postgres on the PC; real Postgres, so the schema moves to Supabase/Neon unchanged |
| Sign-in | Phone code + Google | User choice; Google hidden until keys are in `.env` |
| Payments | Freedom Pay, test mode, behind an adapter | User choice; a stub stands in until merchant keys exist |
| Demo data | None; empty start | User choice (e2e tests create their own data) |
| Name | Tabyl («Табыл») | User choice |
| Order | Website first → user picks UI → Android app | User choice |
| Desktop | No desktop apps; website is phone-first but still works on laptops | User choice |
| Mobile | Kotlin Multiplatform + Compose Multiplatform | User choice; one codebase for Android now and iOS later |
| iOS | Deferred until a Mac is available | User choice; iOS can't be compiled on Linux |
| Repo | Private GitHub `losdek/tabyl`, auto-pushed by the user's hook | User choice |
| UI direction | _pending — user picks at Step 0.3_ | |

## Not yet specified
- Phase 7: Freedom Pay test mode may still require a merchant ID/secret; if signup is needed, the stub covers local work and live keys come from the user.
- Phase 1: SMS provider for real codes (e.g. Nikita.kg, SMS.ru) — chosen at deploy, not now.
- Phase 9 / deploy: hosting choice for photo storage (Supabase Storage vs S3-compatible) is fog; decided when deploying.
- Phase 13: push notifications need a Firebase project from the user; until then the app polls.
- Phase 11+: the Android app talks to the local server through the emulator (`10.0.2.2`); a physical phone needs the PC's LAN IP or a deploy.

## Always / Never
- Always: Russian UI copy with correct typography; mobile-first; every page server-rendered; perf budget checked in CI; secrets only in `.env` (git-ignored).
- Never (this build): desktop apps, an iOS build, Play Store publishing, Kyrgyz translation, delivery/escrow ("безопасная сделка"), real SMS sending, public deploy, demo/seed listings, scraping or copying Lalafo's content, name or look.

## Progress
| Phase | Status |
| --- | --- |
| 0 Foundation | pending |
| 1 Accounts | pending |
| 2 Posting | pending |
| 3 Browse + search | pending |
| 4 Favourites | pending |
| 5 Chat | pending |
| 6 Reviews | pending |
| 7 Promotion + payments | pending |
| 8 Moderation | pending |
| 9 Speed + polish | pending |
| 10 Android toolchain + shell | pending |
| 11 Android browse/search | pending |
| 12 Android posting | pending |
| 13 Android chat/reviews/promote | pending |
| 14 Android release build | pending |
| iOS | deferred (needs a Mac) |
