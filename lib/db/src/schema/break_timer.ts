import { pgTable, text, integer, boolean, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const breakTimerSettingsTable = pgTable("break_timer_settings", {
  id: text("id").primaryKey(),
  workDurationMinutes: integer("work_duration_minutes").notNull().default(45),
  breakDurationMinutes: integer("break_duration_minutes").notNull().default(5),
  notificationModes: jsonb("notification_modes").notNull().default(["visual", "text"]),
  workMessage: text("work_message").notNull().default("Focus time! Stay in the zone."),
  breakMessage: text("break_message").notNull().default("Time for a break! Rest your eyes."),
  endShiftMessage: text("end_shift_message").notNull().default("Great work today! Shift complete."),
  audioEnabled: boolean("audio_enabled").notNull().default(true),
  colorSequencePattern: text("color_sequence_pattern").notNull().default("pulse"),
  transparencyLevel: real("transparency_level").notNull().default(0.3),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBreakTimerSettingsSchema = createInsertSchema(breakTimerSettingsTable).omit({
  updatedAt: true,
});

export type InsertBreakTimerSettings = z.infer<typeof insertBreakTimerSettingsSchema>;
export type BreakTimerSettings = typeof breakTimerSettingsTable.$inferSelect;
