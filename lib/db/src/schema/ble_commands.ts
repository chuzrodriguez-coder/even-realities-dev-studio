import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bleCommandsTable = pgTable("ble_commands", {
  id: text("id").primaryKey(),
  model: text("model").notNull(),
  target: text("target").notNull(),
  commandType: text("command_type").notNull(),
  status: text("status").notNull(),
  responseHex: text("response_hex"),
  description: text("description").notNull(),
  packets: jsonb("packets"),
  payload: jsonb("payload"),
  rawHex: text("raw_hex"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBleCommandSchema = createInsertSchema(bleCommandsTable).omit({
  createdAt: true,
});

export type InsertBleCommand = z.infer<typeof insertBleCommandSchema>;
export type BleCommand = typeof bleCommandsTable.$inferSelect;
