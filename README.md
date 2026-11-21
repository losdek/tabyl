# Табыл

Classifieds marketplace for Kyrgyzstan: website (`web/`) and Android app (`mobile/`).

## Website

```sh
cd web
npm install
npm run dev          # http://localhost:3000 — sign-in codes print in this terminal
npm run check        # types + lint + unit tests
npm run build && npm run e2e   # end-to-end tests on a throwaway database
```

Admins: start with `TABYL_ADMIN_PHONES=+996700123456 npm run dev`.
Data lives in `web/.data/pglite` (Postgres inside the app) and photos in `web/storage`.

Docs: `docs/api.md` (app API), `docs/deploy.md` (going live), `plans/pending/tabyl-mvp.md` (plan and progress).
Design: `design/directions/soft.html` (chosen UI), `design/logo/` (logo kit and generator).
