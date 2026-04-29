-- Align DB with schema: remove unused tables City, RecommendedStudio, PendingBooking
DROP TABLE IF EXISTS "PendingBooking";
DROP TABLE IF EXISTS "RecommendedStudio";
DROP TABLE IF EXISTS "City";
