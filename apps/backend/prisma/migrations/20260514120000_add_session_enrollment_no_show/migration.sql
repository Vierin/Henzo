-- Postgres enum may lack NO_SHOW if DB predates Prisma schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'SessionEnrollmentStatus'
      AND e.enumlabel = 'NO_SHOW'
  ) THEN
    ALTER TYPE "SessionEnrollmentStatus" ADD VALUE 'NO_SHOW';
  END IF;
END
$$;
