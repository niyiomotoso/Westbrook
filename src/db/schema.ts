import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * D1 schema. Timestamps are epoch milliseconds (server clock). Soft deletes
 * via deleted_at/hidden keep on-screen content servable through the 24h
 * media grace window (plan KTD).
 */

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceNgn: integer("price_ngn").notNull(),
  tagText: text("tag_text"),
  enabled: integer("enabled").notNull().default(1),
  sort: integer("sort").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  /** exactly one of roomId / placeTag is set (enforced in the API layer) */
  roomId: text("room_id"),
  placeTag: text("place_tag"), // pool|restaurant|lobby|gym|bar
  /** KV key, content-hashed, e.g. "img/<sha256>.jpg" */
  mediaKey: text("media_key").notNull(),
  sort: integer("sort").notNull().default(0),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  month: text("month").notNull(),
  text: text("text").notNull(),
  consented: integer("consented").notNull(),
  hidden: integer("hidden").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  kicker: text("kicker").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  kicker: text("kicker").notNull(),
  name: text("name").notNull(),
  body: text("body").notNull(),
  mediaKey: text("media_key"),
  startAt: integer("start_at").notNull(),
  durationMs: integer("duration_ms").notNull(),
  canceled: integer("canceled").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

/** Single-row-per-key settings store (values are JSON strings). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const screens = sqliteTable("screens", {
  key: text("key").primaryKey(),
  position: integer("position").notNull(),
  lastSeen: integer("last_seen").notNull(),
  buildId: text("build_id"),
});

/** content_version, activate_at, loop_epoch as text values. */
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
