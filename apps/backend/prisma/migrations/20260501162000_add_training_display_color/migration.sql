-- Add deterministic display color for trainings.
ALTER TABLE "Training"
ADD COLUMN "displayColor" TEXT;

WITH base AS (
  SELECT
    t.id,
    t.name,
    t."trainingCategoryId",
    tc.main_category_id,
    ABS((('x' || SUBSTRING(MD5(COALESCE(tc.main_category_id::text, t."trainingCategoryId"::text, '0')), 1, 8))::bit(32)::bigint)) % 8 AS family_idx,
    ABS((('x' || SUBSTRING(MD5(COALESCE(NULLIF(t.id, ''), NULLIF(TRIM(t.name), ''), 'training')), 1, 8))::bit(32)::bigint)) % 4 AS variant_idx
  FROM "Training" t
  LEFT JOIN "TrainingCategory" tc ON tc.id = t."trainingCategoryId"
),
resolved AS (
  SELECT
    id,
    CASE family_idx
      WHEN 0 THEN (ARRAY['#0EA5E9', '#38BDF8', '#0284C7', '#7DD3FC'])[variant_idx + 1]
      WHEN 1 THEN (ARRAY['#14B8A6', '#2DD4BF', '#0F766E', '#5EEAD4'])[variant_idx + 1]
      WHEN 2 THEN (ARRAY['#22C55E', '#4ADE80', '#15803D', '#86EFAC'])[variant_idx + 1]
      WHEN 3 THEN (ARRAY['#84CC16', '#A3E635', '#4D7C0F', '#BEF264'])[variant_idx + 1]
      WHEN 4 THEN (ARRAY['#F59E0B', '#FBBF24', '#B45309', '#FCD34D'])[variant_idx + 1]
      WHEN 5 THEN (ARRAY['#F97316', '#FB923C', '#C2410C', '#FDBA74'])[variant_idx + 1]
      WHEN 6 THEN (ARRAY['#A855F7', '#C084FC', '#7E22CE', '#D8B4FE'])[variant_idx + 1]
      ELSE (ARRAY['#EC4899', '#F472B6', '#BE185D', '#F9A8D4'])[variant_idx + 1]
    END AS color_hex
  FROM base
)
UPDATE "Training" t
SET "displayColor" = r.color_hex
FROM resolved r
WHERE t.id = r.id;
