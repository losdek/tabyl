# Going live (not done yet — local first, as agreed)

1. **Database** — create a Postgres (Supabase or Neon), enable `pg_trgm`, and swap `web/src/db/client.ts` to `drizzle-orm/postgres-js` with `DATABASE_URL`. Migrations in `web/drizzle/` apply unchanged.
2. **Photos** — move `storage/` to S3-compatible storage (Supabase Storage, Cloudflare R2) behind the same `/media/p/...` URLs, or put a CDN in front.
3. **Chat live updates** — with more than one server process, replace the in-process bus in `server/chat.ts` with Postgres `LISTEN/NOTIFY`.
4. **SMS** — plug a provider (e.g. Nikita.kg) into `CodeSender` in `server/auth-core.ts`.
5. **Environment**
   - `TABYL_SECRET` (random, 32+ chars), `TABYL_ORIGIN` (https URL), `TABYL_ADMIN_PHONES`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — redirect URI `<origin>/auth/google/callback`
   - `FREEDOM_MERCHANT_ID`, `FREEDOM_SECRET`, `FREEDOM_TESTING=1` until live; result URL `<origin>/api/pay/freedom/result`
6. **Legal** — have a lawyer check `/privacy` and `/rules` against the KR personal-data law before launch.
