import { Router, type IRouter } from "express";
import { LayoutTextBody, LayoutTextResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DISPLAY_CONFIG = {
  G1: { widthPx: 488, heightPx: 136, linesPerScreen: 5, charsPerLine: 40 },
  G2: { widthPx: 640, heightPx: 350, linesPerScreen: 7, charsPerLine: 52 },
};

function wrapText(text: string, charsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.includes("\n")) {
      const parts = word.split("\n");
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === 0) {
          if ((current + (current ? " " : "") + part).length > charsPerLine) {
            if (current) lines.push(current);
            lines.push(part);
            current = "";
          } else {
            current += (current ? " " : "") + part;
          }
        } else {
          if (current) lines.push(current);
          current = part;
        }
      }
      continue;
    }

    const candidate = current + (current ? " " : "") + word;
    if (candidate.length > charsPerLine) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function makePacket(side: "left" | "right", idx: number, lines: string[], packetIndex: number) {
  const lineBytes = lines.map(l => Buffer.from(l, "utf8"));
  const totalBytes = lineBytes.reduce((s, b) => s + b.length + 1, 0);
  const hexBytes = `0x4E 0x${idx.toString(16).padStart(2, "0")} [${lines.length} lines, ${totalBytes}B]`;
  return { index: packetIndex, hexBytes, sizeBytes: totalBytes + 3, side };
}

router.post("/layout-text", (req, res) => {
  const body = LayoutTextBody.parse(req.body);
  const model = body.model as "G1" | "G2";
  const cfg = DISPLAY_CONFIG[model];

  const linesPerScreen = body.linesPerScreen ?? cfg.linesPerScreen;
  const displayWidthPx = body.maxWidthPx ?? cfg.widthPx;

  const allLines = wrapText(body.text, cfg.charsPerLine);
  const totalLines = allLines.length;

  const pages: Array<{
    pageIndex: number;
    lines: string[];
    packets: Array<{ index: number; hexBytes: string; sizeBytes: number; side: "left" | "right" }>;
  }> = [];

  let packetCounter = 0;
  for (let pageIdx = 0; pageIdx * linesPerScreen < allLines.length; pageIdx++) {
    const pageLines = allLines.slice(pageIdx * linesPerScreen, (pageIdx + 1) * linesPerScreen);

    const packets: Array<{ index: number; hexBytes: string; sizeBytes: number; side: "left" | "right" }> = [];

    const firstChunk = pageLines.slice(0, 3);
    const secondChunk = pageLines.slice(3);

    if (firstChunk.length > 0) {
      packets.push(makePacket("left", pageIdx, firstChunk, packetCounter++));
      packets.push(makePacket("right", pageIdx, firstChunk, packetCounter++));
    }
    if (secondChunk.length > 0) {
      packets.push(makePacket("left", pageIdx, secondChunk, packetCounter++));
      packets.push(makePacket("right", pageIdx, secondChunk, packetCounter++));
    }

    pages.push({ pageIndex: pageIdx, lines: pageLines, packets });
  }

  const result = LayoutTextResponse.parse({
    model,
    totalLines,
    totalPages: pages.length,
    totalPackets: packetCounter,
    pages,
    displayWidthPx,
    linesPerScreen,
  });

  res.json(result);
});

export default router;
