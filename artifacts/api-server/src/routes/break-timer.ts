import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { breakTimerSettingsTable } from "@workspace/db/schema";
import {
  UpdateBreakTimerSettingsBody,
  GetBreakTimerSettingsResponse,
  UpdateBreakTimerSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SINGLETON_ID = "default";

const DEFAULT_SETTINGS = {
  id: SINGLETON_ID,
  workDurationMinutes: 45,
  breakDurationMinutes: 5,
  notificationModes: ["visual", "text"] as string[],
  workMessage: "Focus time! Stay in the zone.",
  breakMessage: "Time for a break! Rest your eyes.",
  endShiftMessage: "Great work today! Shift complete.",
  audioEnabled: true,
  colorSequencePattern: "pulse",
  transparencyLevel: 0.3,
  updatedAt: new Date(),
};

async function getOrCreateSettings() {
  const [existing] = await db
    .select()
    .from(breakTimerSettingsTable)
    .where(
      (await import("drizzle-orm")).eq(breakTimerSettingsTable.id, SINGLETON_ID)
    );

  if (existing) return existing;

  await db.insert(breakTimerSettingsTable).values(DEFAULT_SETTINGS);
  const [created] = await db
    .select()
    .from(breakTimerSettingsTable)
    .where(
      (await import("drizzle-orm")).eq(breakTimerSettingsTable.id, SINGLETON_ID)
    );
  return created;
}

function mapSettings(s: typeof breakTimerSettingsTable.$inferSelect) {
  return {
    id: s.id,
    workDurationMinutes: s.workDurationMinutes,
    breakDurationMinutes: s.breakDurationMinutes,
    notificationModes: (s.notificationModes as string[]) ?? [],
    workMessage: s.workMessage,
    breakMessage: s.breakMessage,
    endShiftMessage: s.endShiftMessage,
    audioEnabled: s.audioEnabled,
    colorSequencePattern: s.colorSequencePattern,
    transparencyLevel: s.transparencyLevel ?? 0.3,
    updatedAt: s.updatedAt,
  };
}

router.get("/settings", async (_req, res) => {
  const settings = await getOrCreateSettings();
  const result = GetBreakTimerSettingsResponse.parse(mapSettings(settings));
  res.json(result);
});

router.put("/settings", async (req, res) => {
  const body = UpdateBreakTimerSettingsBody.parse(req.body);
  const { eq } = await import("drizzle-orm");

  await getOrCreateSettings();

  await db
    .update(breakTimerSettingsTable)
    .set({
      ...(body.workDurationMinutes !== undefined && { workDurationMinutes: body.workDurationMinutes }),
      ...(body.breakDurationMinutes !== undefined && { breakDurationMinutes: body.breakDurationMinutes }),
      ...(body.notificationModes !== undefined && { notificationModes: body.notificationModes }),
      ...(body.workMessage !== undefined && { workMessage: body.workMessage }),
      ...(body.breakMessage !== undefined && { breakMessage: body.breakMessage }),
      ...(body.endShiftMessage !== undefined && { endShiftMessage: body.endShiftMessage }),
      ...(body.audioEnabled !== undefined && { audioEnabled: body.audioEnabled }),
      ...(body.colorSequencePattern !== undefined && { colorSequencePattern: body.colorSequencePattern }),
      ...(body.transparencyLevel !== undefined && { transparencyLevel: body.transparencyLevel }),
      updatedAt: new Date(),
    })
    .where(eq(breakTimerSettingsTable.id, SINGLETON_ID));

  const updated = await getOrCreateSettings();
  const result = UpdateBreakTimerSettingsResponse.parse(mapSettings(updated));
  res.json(result);
});

export default router;
