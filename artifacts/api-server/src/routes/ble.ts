import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { bleCommandsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import {
  BleSendCommandBody,
  BleSendCommandResponse,
  GetBleCommandsResponse,
  ClearBleCommandsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  text: "Text display packet sent to glasses HUD",
  image: "BMP image transmission (194-byte packets, 0x15 header, CRC32-XZ verification)",
  ai_response: "AI/LLM response text streamed to glasses display",
  microphone_on: "Microphone activation command (0x0E 0x01) sent to right arm",
  microphone_off: "Microphone deactivation sent to right arm",
  raw: "Raw hex byte sequence transmitted directly",
  teleprompter: "Teleprompter sequence: auth(x7) → display config → init → content pages → sync trigger",
  auth: "Authentication packet sent to establish G2 session",
  display_config: "Display configuration update (0x0E-20 type=2)",
  notification: "Notification data packet for glasses HUD",
};

const COMMAND_RESPONSES: Record<string, { hex: string; status: "ack" | "nack" | "pending" }> = {
  text: { hex: "0xC0 0x01", status: "ack" },
  image: { hex: "0xC1 0x01", status: "ack" },
  ai_response: { hex: "0xC0 0x31", status: "ack" },
  microphone_on: { hex: "0xC9 0x01", status: "ack" },
  microphone_off: { hex: "0xCA 0x00", status: "ack" },
  raw: { hex: "0xFF 0x00", status: "pending" },
  teleprompter: { hex: "0x80 0x00 0x0E", status: "ack" },
  auth: { hex: "0xA0 0x01", status: "ack" },
  display_config: { hex: "0xA1 0x01", status: "ack" },
  notification: { hex: "0xC2 0x01", status: "ack" },
};

function buildPackets(commandType: string, target: string, payload: Record<string, unknown> | undefined): Array<{ index: number; hexBytes: string; sizeBytes: number; side: "left" | "right" }> {
  const sides: Array<"left" | "right"> = target === "both" ? ["left", "right"] : [target as "left" | "right"];
  const packets: Array<{ index: number; hexBytes: string; sizeBytes: number; side: "left" | "right" }> = [];

  if (commandType === "text" || commandType === "ai_response") {
    const text = String(payload?.text ?? "Hello from Even Studio");
    const chunkSize = 64;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    chunks.forEach((chunk, i) => {
      const hexBytes = Buffer.from(chunk).toString("hex").match(/.{2}/g)?.map(b => `0x${b.toUpperCase()}`).join(" ") ?? "";
      sides.forEach(side => {
        packets.push({ index: packets.length, hexBytes: `0x4E 0x03 ${hexBytes}`, sizeBytes: chunk.length + 3, side });
      });
    });
  } else if (commandType === "microphone_on") {
    packets.push({ index: 0, hexBytes: "0x0E 0x01", sizeBytes: 2, side: "right" });
  } else if (commandType === "microphone_off") {
    packets.push({ index: 0, hexBytes: "0x0E 0x00", sizeBytes: 2, side: "right" });
  } else if (commandType === "image") {
    const packetCount = Math.ceil(574 * 136 / 8 / 194);
    for (let i = 0; i < Math.min(packetCount, 4); i++) {
      sides.forEach(side => {
        const addr = i === 0 ? " 0x00 0x1C 0x00 0x00" : "";
        packets.push({ index: packets.length, hexBytes: `0x15 0x${i.toString(16).padStart(2, "0")}${addr} [194 bytes BMP data]`, sizeBytes: i === 0 ? 200 : 196, side });
      });
    }
    sides.forEach(side => {
      packets.push({ index: packets.length, hexBytes: "0x20 0x0D 0x0E", sizeBytes: 3, side });
    });
  } else if (commandType === "auth") {
    for (let i = 0; i < 7; i++) {
      sides.forEach(side => {
        packets.push({ index: packets.length, hexBytes: `0xAU 0x${i.toString(16).padStart(2, "0")} [auth data]`, sizeBytes: 16, side });
      });
    }
  } else if (commandType === "display_config") {
    sides.forEach(side => {
      packets.push({ index: packets.length, hexBytes: "0x0E 0x20 0x02 [config data]", sizeBytes: 20, side });
    });
  } else if (commandType === "teleprompter") {
    const pages = Number(payload?.pages ?? 3);
    for (let i = 0; i < 7; i++) {
      sides.forEach(side => {
        packets.push({ index: packets.length, hexBytes: `0xAU 0x${i.toString(16).padStart(2, "0")} [auth]`, sizeBytes: 16, side });
      });
    }
    sides.forEach(side => {
      packets.push({ index: packets.length, hexBytes: "0x0E 0x20 0x02 [display config]", sizeBytes: 20, side });
    });
    sides.forEach(side => {
      packets.push({ index: packets.length, hexBytes: "0x06 0x20 0x01 [teleprompter init]", sizeBytes: 20, side });
    });
    for (let p = 0; p < Math.min(pages, 5); p++) {
      sides.forEach(side => {
        packets.push({ index: packets.length, hexBytes: `0x06 0x20 0x03 [page ${p} content]`, sizeBytes: 64, side });
      });
    }
    sides.forEach(side => {
      packets.push({ index: packets.length, hexBytes: "0x06 0x20 0xFF [mid-stream marker]", sizeBytes: 4, side });
    });
    sides.forEach(side => {
      packets.push({ index: packets.length, hexBytes: "0x80 0x00 0x0E [sync trigger]", sizeBytes: 4, side });
    });
  } else {
    sides.forEach(side => {
      packets.push({ index: 0, hexBytes: "0xFF", sizeBytes: 1, side });
    });
  }

  return packets;
}

router.post("/send-command", async (req, res) => {
  const body = BleSendCommandBody.parse(req.body);
  const { model, target, commandType, payload, rawHex } = body;

  const resp = COMMAND_RESPONSES[commandType] ?? { hex: "0xFF", status: "pending" as const };
  const packets = buildPackets(commandType, target, payload as Record<string, unknown> | undefined);
  const description = COMMAND_DESCRIPTIONS[commandType] ?? "Custom command sent to glasses";

  const id = randomUUID();
  const now = new Date();

  await db.insert(bleCommandsTable).values({
    id,
    model,
    target,
    commandType,
    status: resp.status,
    responseHex: rawHex ? `ECHO: ${rawHex}` : resp.hex,
    description,
    packets,
    payload: (payload as Record<string, unknown>) ?? null,
    rawHex: rawHex ?? null,
    createdAt: now,
  });

  const result = BleSendCommandResponse.parse({
    id,
    timestamp: now.toISOString(),
    model,
    target,
    commandType,
    status: resp.status,
    responseHex: rawHex ? `ECHO: ${rawHex}` : resp.hex,
    description,
    packets,
  });

  res.json(result);
});

router.get("/commands", async (_req, res) => {
  const rows = await db
    .select()
    .from(bleCommandsTable)
    .orderBy(desc(bleCommandsTable.createdAt))
    .limit(100);

  const result = GetBleCommandsResponse.parse({
    commands: rows.map(r => ({
      id: r.id,
      timestamp: r.createdAt.toISOString(),
      model: r.model,
      target: r.target,
      commandType: r.commandType,
      status: r.status,
      responseHex: r.responseHex ?? undefined,
      description: r.description,
      packets: r.packets ?? [],
    })),
    total: rows.length,
  });

  res.json(result);
});

router.delete("/commands", async (_req, res) => {
  await db.delete(bleCommandsTable);
  const result = ClearBleCommandsResponse.parse({ success: true, message: "BLE command log cleared" });
  res.json(result);
});

export default router;
