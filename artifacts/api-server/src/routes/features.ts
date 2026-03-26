import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { featuresTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  CreateFeatureBody,
  UpdateFeatureBody,
  ListFeaturesResponse,
  GetFeatureResponse,
  UpdateFeatureResponse,
  DeleteFeatureResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapFeature(f: typeof featuresTable.$inferSelect) {
  return {
    id: f.id,
    name: f.name,
    description: f.description,
    targetModel: f.targetModel,
    category: f.category,
    code: f.code ?? undefined,
    config: (f.config as Record<string, unknown>) ?? undefined,
    isEnabled: f.isEnabled,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(featuresTable)
    .orderBy(desc(featuresTable.createdAt));

  const result = ListFeaturesResponse.parse({
    features: rows.map(mapFeature),
    total: rows.length,
  });

  res.json(result);
});

router.post("/", async (req, res) => {
  const body = CreateFeatureBody.parse(req.body);
  const now = new Date();
  const id = randomUUID();

  await db.insert(featuresTable).values({
    id,
    name: body.name,
    description: body.description,
    targetModel: body.targetModel,
    category: body.category,
    code: body.code ?? null,
    config: (body.config as Record<string, unknown>) ?? null,
    isEnabled: body.isEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(featuresTable).where(eq(featuresTable.id, id));
  res.status(201).json(mapFeature(row));
});

router.get("/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(featuresTable)
    .where(eq(featuresTable.id, req.params.id));

  if (!row) {
    res.status(404).json({ error: "Feature not found" });
    return;
  }

  const result = GetFeatureResponse.parse(mapFeature(row));
  res.json(result);
});

router.put("/:id", async (req, res) => {
  const body = UpdateFeatureBody.parse(req.body);

  const [existing] = await db
    .select()
    .from(featuresTable)
    .where(eq(featuresTable.id, req.params.id));

  if (!existing) {
    res.status(404).json({ error: "Feature not found" });
    return;
  }

  await db
    .update(featuresTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.targetModel !== undefined && { targetModel: body.targetModel }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.config !== undefined && { config: body.config as Record<string, unknown> }),
      ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
      updatedAt: new Date(),
    })
    .where(eq(featuresTable.id, req.params.id));

  const [updated] = await db
    .select()
    .from(featuresTable)
    .where(eq(featuresTable.id, req.params.id));

  const result = UpdateFeatureResponse.parse(mapFeature(updated));
  res.json(result);
});

router.delete("/:id", async (req, res) => {
  const [existing] = await db
    .select()
    .from(featuresTable)
    .where(eq(featuresTable.id, req.params.id));

  if (!existing) {
    res.status(404).json({ error: "Feature not found" });
    return;
  }

  await db.delete(featuresTable).where(eq(featuresTable.id, req.params.id));

  const result = DeleteFeatureResponse.parse({ success: true, message: "Feature deleted" });
  res.json(result);
});

export default router;
