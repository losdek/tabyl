import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const now = () => sql`now()`;

/* ---------- people ---------- */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    phone: text("phone"),
    googleSub: text("google_sub"),
    email: text("email"),
    name: text("name").notNull().default(""),
    avatarKey: text("avatar_key"),
    city: text("city").notNull().default("bishkek"),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    bannedAt: ts("banned_at"),
    banReason: text("ban_reason"),
    createdAt: ts("created_at").notNull().default(now()),
    lastSeenAt: ts("last_seen_at").notNull().default(now()),
  },
  (t) => [uniqueIndex("users_phone_uq").on(t.phone), uniqueIndex("users_google_uq").on(t.googleSub)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha-256 of the token
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["web", "app"] }).notNull().default("web"),
    createdAt: ts("created_at").notNull().default(now()),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginCodes = pgTable(
  "login_codes",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: ts("created_at").notNull().default(now()),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
  },
  (t) => [index("login_codes_phone_idx").on(t.phone, t.createdAt)],
);

/* ---------- ads ---------- */

export const ads = pgTable(
  "ads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    price: bigint("price", { mode: "number" }), // null = «Договорная», 0 = «Даром»
    currency: text("currency", { enum: ["KGS", "USD"] }).notNull().default("KGS"),
    negotiable: boolean("negotiable").notNull().default(false),
    condition: text("condition", { enum: ["new", "used"] }),
    city: text("city").notNull(),
    district: text("district").notNull().default(""),
    attrs: jsonb("attrs").$type<Record<string, string | number | boolean>>().notNull().default({}),
    status: text("status", { enum: ["draft", "pending", "active", "rejected", "sold", "closed"] })
      .notNull()
      .default("draft"),
    rejectReason: text("reject_reason"),
    views: integer("views").notNull().default(0),
    phoneViews: integer("phone_views").notNull().default(0),
    createdAt: ts("created_at").notNull().default(now()),
    updatedAt: ts("updated_at").notNull().default(now()),
    bumpedAt: ts("bumped_at").notNull().default(now()),
    promotedUntil: ts("promoted_until"),
    search: tsvector("search").generatedAlwaysAs(
      sql`setweight(to_tsvector('russian', coalesce(title, '')), 'A') || setweight(to_tsvector('russian', coalesce(description, '')), 'B')`,
    ),
  },
  (t) => [
    index("ads_feed_idx").on(t.status, t.city, t.bumpedAt),
    index("ads_cat_idx").on(t.status, t.category, t.bumpedAt),
    index("ads_user_idx").on(t.userId, t.status),
    index("ads_search_idx").using("gin", t.search),
    index("ads_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ],
);

export const adPhotos = pgTable(
  "ad_photos",
  {
    id: text("id").primaryKey(),
    adId: text("ad_id").references(() => ads.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blur: text("blur").notNull(), // tiny base64 placeholder
    phash: text("phash").notNull(), // 64-bit perceptual hash, hex
    createdAt: ts("created_at").notNull().default(now()),
  },
  (t) => [index("ad_photos_ad_idx").on(t.adId, t.position), index("ad_photos_phash_idx").on(t.phash)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    adId: text("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().default(now()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.adId] })],
);

export const savedSearches = pgTable("saved_searches", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: jsonb("query").$type<Record<string, string>>().notNull(),
  label: text("label").notNull(),
  lastSeenAt: ts("last_seen_at").notNull().default(now()),
  createdAt: ts("created_at").notNull().default(now()),
});

/* ---------- chat ---------- */

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    adId: text("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sellerId: text("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().default(now()),
    lastMessageAt: ts("last_message_at").notNull().default(now()),
  },
  (t) => [
    uniqueIndex("conversations_ad_buyer_uq").on(t.adId, t.buyerId),
    index("conversations_buyer_idx").on(t.buyerId, t.lastMessageAt),
    index("conversations_seller_idx").on(t.sellerId, t.lastMessageAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["text", "photo", "place"] }).notNull().default("text"),
    body: text("body").notNull().default(""),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().default(now()),
    readAt: ts("read_at"),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.createdAt)],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().default(now()),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

/* ---------- reviews ---------- */

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    text: text("text").notNull().default(""),
    reply: text("reply"),
    replyAt: ts("reply_at"),
    createdAt: ts("created_at").notNull().default(now()),
  },
  (t) => [uniqueIndex("reviews_author_seller_uq").on(t.authorId, t.sellerId), index("reviews_seller_idx").on(t.sellerId)],
);

/* ---------- promotion & payments ---------- */

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    adId: text("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
    tier: text("tier").notNull(),
    amount: integer("amount").notNull(), // сом
    status: text("status", { enum: ["created", "pending", "paid", "failed", "refunded"] })
      .notNull()
      .default("created"),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().default(now()),
    paidAt: ts("paid_at"),
  },
  (t) => [index("orders_user_idx").on(t.userId, t.createdAt)],
);

export const promotions = pgTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    adId: text("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    tier: text("tier").notNull(),
    startsAt: ts("starts_at").notNull().default(now()),
    endsAt: ts("ends_at").notNull(),
  },
  (t) => [index("promotions_ad_idx").on(t.adId, t.endsAt)],
);

/* ---------- moderation ---------- */

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type", { enum: ["ad", "user", "message"] }).notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    note: text("note").notNull().default(""),
    auto: boolean("auto").notNull().default(false),
    status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
    resolution: text("resolution"),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: ts("resolved_at"),
    createdAt: ts("created_at").notNull().default(now()),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt), index("reports_target_idx").on(t.targetType, t.targetId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().default(now()),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);
