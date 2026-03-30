# Lila Games - Nakama Server

A high-performance game server built on [Nakama](https://heroiclabs.com/docs/nakama/) using TypeScript and PostgreSQL.

## 🚀 Quick Start

### 1. Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Bun](https://bun.sh/) (for local development and building)

### 2. Installation
```bash
bun install
```

### 3. Development Workflow
The server logic is written in TypeScript and compiled to JavaScript for the Nakama runtime.

- **Build once:** `bun run build`
- **Build & Watch:** `tsc --watch` (compiles `src/` to `dist/` on save)

### 4. Running the Stack
```bash
docker compose up -d
```

## 🛠 Project Structure
- `src/`: TypeScript source code for game logic (RPCs, Hooks, Matches).
- `dist/`: Compiled JavaScript output (mapped to the Nakama container).
- `docker-compose.yaml`: Services for Nakama, PostgreSQL, and Prometheus.
- `dev-journal.md`: History of architectural decisions and setup steps.

## 🔗 Access Points
- **Nakama Console:** [http://localhost:7351](http://localhost:7351) (Admin/password)
- **API Endpoint:** `http://localhost:7350`
- **PostgreSQL:** `localhost:5432` (DB: `nakama`, User: `postgres`, Pass: `localdb`)
- **Prometheus UI:** [http://localhost:9090](http://localhost:9090)

## 📜 Server Logic
Custom logic starts in `src/index.ts`. Nakama identifies the entry point via the `InitModule` function.

```typescript
function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
  logger.info('Server logic initialized!');
}
```
