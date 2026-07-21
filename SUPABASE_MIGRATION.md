# Supabase database migration

## 1. Create the Supabase project
Create a project and save the database password.

## 2. Add the connection string
In Supabase, open **Connect**, choose the **Session pooler** for local development or a long-running Node server, and copy the URI.

Create `.env` from `.env.example` and set `DATABASE_URL`. Never commit `.env`.

## 3. Install dependencies
```bash
pnpm install
```

## 4. Create the tables
For this one-time conversion, use either:

```bash
pnpm db:push
```

or paste `drizzle/0000_supabase_initial.sql` into the Supabase SQL Editor and run it.

## 5. Import Manus CSV data
In Supabase Table Editor, open the matching table and import its CSV.

Import `users` before `signupIntakes`. Preserve existing `id` values.

After import, reset each identity sequence in the SQL Editor:

```sql
SELECT setval(
  pg_get_serial_sequence('"users"', 'id'),
  COALESCE((SELECT MAX(id) FROM "users"), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('"signupIntakes"', 'id'),
  COALESCE((SELECT MAX(id) FROM "signupIntakes"), 1),
  true
);
```

## 6. Test
Run:

```bash
pnpm dev
```

Confirm that the app can read existing submissions and create a new test submission.

## Important
The database layer is now Supabase/Postgres-ready. The repository still contains Manus-specific authentication, notification, storage, and runtime integrations under `server/_core`, `server/storage.ts`, and the Vite Manus runtime plugin. Those are separate from the database migration and may need replacement before Manus can be fully removed.
