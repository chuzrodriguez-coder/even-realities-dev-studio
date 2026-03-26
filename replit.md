# Even Realities Dev Studio

## Overview

Full-stack development platform for building and testing custom features for Even Realities G1 and G2 smart glasses. Includes a BLE protocol simulator, display HUD simulator, text layout tool, feature workbench, and protocol reference — all in a dark developer-focused UI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/even-dev) — dark green dev UI
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Glasses Reference

### G1
- Display: 576×136px, 1-bit green monochrome, ~25° FOV
- BLE: Dual connection (left + right arm, separate BLE each)
- Text protocol: 5 lines/screen, first 3 lines = packet 1, last 2 lines = packet 2
- Image: 1-bit BMP 576×136, 194-byte packets, 0x15 header, CRC32-XZ
- Key commands: `0x0E 0x01` = mic on, `0xF5 0x17` = AI activate, `[0x20,0x0D,0x0E]` = end packet

### G2
- Display: 640×350px, 60Hz, green monochrome, 27.5° FOV
- BLE: Dual connection (left + right arm)
- Teleprompter protocol: auth(×7) → display_config(0x0E-20 t=2) → init(0x06-20 t=1) → content_pages(0x06-20 t=3) → mid_stream(0x06-20 t=255) → sync_trigger(0x80-00 t=14)
- Weight: 36g, IP65, BT 5.2

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── even-dev/          # React+Vite frontend — Even Dev Studio UI
│   └── api-server/        # Express API server
│       └── src/routes/
│           ├── ble.ts     # BLE simulator routes
│           ├── display.ts # Text layout utility routes
│           └── features.ts# Feature CRUD routes
├── lib/
│   ├── api-spec/          # OpenAPI spec + Orval codegen config
│   ├── api-client-react/  # Generated React Query hooks
│   ├── api-zod/           # Generated Zod schemas from OpenAPI
│   └── db/
│       └── src/schema/
│           ├── features.ts    # Custom features table
│           └── ble_commands.ts# BLE command log table
└── scripts/
```

## API Routes

- `GET /api/healthz` — health check
- `POST /api/ble/send-command` — simulate a BLE command to glasses
- `GET /api/ble/commands` — get BLE command log
- `DELETE /api/ble/commands` — clear command log
- `POST /api/display/layout-text` — calculate text page/packet layout
- `GET /api/features` — list custom features
- `POST /api/features` — create feature
- `GET /api/features/:id` — get feature
- `PUT /api/features/:id` — update feature
- `DELETE /api/features/:id` — delete feature

## Frontend Sections

1. **Display Simulator** — G1/G2 HUD preview, text layout with packet breakdown
2. **BLE Workbench** — Command builder, packet inspector, command log
3. **Features** — CRUD workbench for custom feature development
4. **Protocol Ref** — Full G1/G2 BLE protocol quick reference

## Development Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API types after spec changes
- `pnpm --filter @workspace/db run push` — push schema changes to DB
- `pnpm --filter @workspace/api-server run dev` — run API in dev mode
- `pnpm --filter @workspace/even-dev run dev` — run frontend
