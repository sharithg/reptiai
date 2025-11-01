# Migration Workflow

- Never hand-write SQL migration files. Instead, run `pnpm --dir backend db:generate` (or `pnpm db:generate` from inside `backend/`) to produce migrations.
- If a migration needs editing, regenerate it with the command above rather than modifying existing SQL manually.
