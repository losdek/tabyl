# Tabyl API v1

Base: `/api/v1`. JSON in, JSON out. Auth: `Authorization: Bearer <token>` from `auth/verify`.
Errors: `{ "error": "<Russian message>", "fields": { "<field>": "<message>" } }` with 401 / 403 / 404 / 422 / 429 / 500.

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `meta` | — | categories (with attributes), cities, promotion tiers, payment mode |
| POST | `auth/code` | `{ phone }` | `{ ok }` — sends a 6-digit code |
| POST | `auth/verify` | `{ phone, code }` | `{ token, expiresAt, user }` |
| POST | `auth/logout` | — | ends the token's session |
| GET / PATCH | `me` | PATCH `{ name, city }` | user, unread count, rating |
| GET | `me/ads` | — | own ads, every status |
| GET | `ads` | `q, city, cat, pmin, pmax, cur, cond, photo, sort, a_<attr>, a_<attr>min/max, cursor, limit` | `{ items, nextCursor, favorites }` |
| POST | `ads` | ad input (see `AdInput` in `web/src/server/ads.ts`) | `{ id, status }` (`pending` when held by auto-checks) |
| GET / PUT | `ads/:id` | PUT ad input | detail with photos, seller, rating, `favorite`, `mine` |
| POST | `ads/:id/status` | `{ status: active \| sold \| closed }` | `{ ok }` |
| POST | `ads/:id/favorite` | — | `{ on }` |
| POST | `ads/:id/phone` | — | `{ phone }` (counted) |
| POST | `ads/:id/chat` | — | `{ conversationId }` |
| POST | `ads/:id/promote` | `{ tier }` | `{ orderId, provider, amount, paymentUrl? }` — open `paymentUrl` in a Custom Tab |
| POST | `orders/:id/test-pay` | `{ ok: boolean }` | test checkout, only while Freedom Pay keys are absent |
| GET | `orders/:id` | — | order status |
| GET | `favorites` | — | `{ items }` |
| GET | `chats` | — | inbox with unread counts |
| GET | `chats/:id` | — | thread (marks it read) |
| POST | `chats/:id/messages` | `{ kind: "text", body }` / `{ kind: "photo", photoId }` / `{ kind: "place", address, note }` | message |
| POST | `chats/:id/read` | — | `{ ok }` |
| GET | `users/:id` | — | public profile, ads, reviews, `canReview` |
| POST | `users/:id/reviews` | `{ rating, text }` | `{ ok }` |
| POST | `reports` | `{ targetType, targetId, reason, note }` | `{ ok }` |

Outside `/api/v1`: `POST /api/upload` (multipart `file`, returns `{ id, width, height, blur }`),
`GET /api/chat/:id/stream` (Server-Sent Events: `message`, `read`), photos at `/media/p/<id>/<320|640|1280>.<avif|webp>`.
