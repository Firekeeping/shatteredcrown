import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const multiplayerSessions = sqliteTable("multiplayer_sessions", {
  id: text("id").primaryKey(),
  hostToken: text("host_token").notNull(),
  guestToken: text("guest_token").notNull(),
  snapshot: text("snapshot").notNull(),
  heroIds: text("hero_ids").notNull().default("[]"),
  assignedHeroId: text("assigned_hero_id"),
  revision: integer("revision").notNull().default(1),
  commandSeq: integer("command_seq").notNull().default(0),
  handledSeq: integer("handled_seq").notNull().default(0),
  commandJson: text("command_json"),
  dialogueClaimJson: text("dialogue_claim_json"),
  dialogueClaimRevision: integer("dialogue_claim_revision"),
  guestConnectedAt: integer("guest_connected_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("multiplayer_sessions_updated_idx").on(table.updatedAt)]);
