<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Cloud Agent bootstrap is defined in `.cursor/environment.json`. On start, PostgreSQL is brought up locally and `.env` / `.env.local` are created with dev defaults when missing.

| Task | Command |
| --- | --- |
| Install (also runs migrations + dev admin seed) | `bash .cursor/scripts/install.sh` |
| Start PostgreSQL only | `bash .cursor/scripts/start.sh` |
| Dev server | `npm run dev -- --hostname 0.0.0.0 --port 3000` (also available as the **Next.js dev** terminal) |
| Prisma migrate | `npx prisma migrate deploy` |
| Lint | `npm run lint` (may require missing `@typescript-eslint/*` peer deps in this repo) |
| Production build | `npm run build` |

**Local dev login (seeded):** phone `9876543210`, password `DevAdmin123!` (ADMIN).

Optional integrations (not required for core dev): `SMTP_*`, Supabase (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`), Cloudflare R2 (`R2_*`), and the Python `document-reader` service (`DOCUMENT_READER_URL`).
