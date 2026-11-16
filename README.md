# ziggler

> A real-time task manager — Go/Gin backend, Next.js 16 + React 19 frontend, dnd-kit board, Socket.IO live updates.

[![CI](https://github.com/zzeordyga/ziggler/actions/workflows/ci.yml/badge.svg)](https://github.com/zzeordyga/ziggler/actions/workflows/ci.yml)

## Stack

- **Backend**: Go 1.25 · Gin 1.10 · GORM · golang-jwt **v5** · gorilla/websocket · SQLite (default) or **PostgreSQL** (`DB_DRIVER=postgres` + `DATABASE_URL`)
- **Frontend**: Next.js 16 · React 19 · Tailwind 4 · TanStack Query 5 · Zustand · dnd-kit · socket.io
- `/health` endpoint, env validation (32-char JWT secret enforced), structured `slog` logging (JSON in prod)

## Features

- Kanban board with drag & drop (dnd-kit) — crisp drag feedback, touch/keyboard-friendly actions
- Task CRUD, subtasks, assignment, status columns, live updates over websockets
- Search/filter, statistics dashboard, auth (JWT, bcrypt)
- Dark/light theme toggle (persisted, system-aware) on shared revival tokens
- Loading skeletons, empty states, error states with retry

## Local development

```bash
# backend
cd backend
export JWT_SECRET=$(openssl rand -hex 32)
go run .                       # :8080

# frontend
cd frontend
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8080 pnpm dev   # :3000
```

## Verify

```bash
cd backend && go vet ./... && go test ./...    # 24 tests
cd frontend && pnpm lint && pnpm build
```

## Deploy

- **Free now**: `Dockerfile.prod` builds one image (Go binary + Next standalone + nginx) →
  GHCR → **Fly.io** (volume for SQLite so data survives redeploys; see `fly.toml`).
- **Docker Compose**: `docker-compose.prod.yml` (backend + frontend + optional nginx profile).
- **AWS later**: ECS Fargate/App Runner + RDS Postgres, image from ECR — set `DB_DRIVER=postgres`
  and `DATABASE_URL`; no code changes needed.