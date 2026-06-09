-- Defense-in-depth: backend uses Prisma (direct Postgres), not PostgREST.
-- Revoke anon/authenticated access to application tables exposed via Supabase API.
-- Run in Supabase Dashboard → SQL Editor (or: supabase db push).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
      r.tablename,
    );
  END LOOP;
END $$;

REVOKE ALL ON SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
