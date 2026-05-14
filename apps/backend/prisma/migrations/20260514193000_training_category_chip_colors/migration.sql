-- TrainingCategory: chip colors, new canonical list, drop main_category_id.

BEGIN;

ALTER TABLE "TrainingCategory" ADD COLUMN IF NOT EXISTS "chip_bg_hex" TEXT;
ALTER TABLE "TrainingCategory" ADD COLUMN IF NOT EXISTS "chip_fg_hex" TEXT;

UPDATE "TrainingCategory"
SET "chip_bg_hex" = COALESCE("chip_bg_hex", '#6B7280'),
    "chip_fg_hex" = COALESCE("chip_fg_hex", '#FFFFFF')
WHERE "chip_bg_hex" IS NULL;

ALTER TABLE "TrainingCategory" ALTER COLUMN "chip_bg_hex" SET NOT NULL;

-- Upsert canonical categories (colors + localized labels).
INSERT INTO "TrainingCategory" ("name_en", "name_vn", "name_ru", "chip_bg_hex", "chip_fg_hex")
VALUES
  ('Yoga', 'Yoga', 'Йога', '#FDE047', '#171717'),
  ('Pilates', 'Pilates', 'Пилатес', '#FB7185', '#FFFFFF'),
  ('Stretching', 'Stretching', 'Растяжка', '#F472B6', '#FFFFFF'),
  (
    'Strength',
    'Strength',
    'Силовые',
    '#1E293B',
    '#FFFFFF'
  ),
  (
    'Meditation',
    'Meditation',
    'Медитация',
    '#7C3AED',
    '#FFFFFF'
  ),
  (
    'Recovery',
    'Recovery',
    'Восстановление',
    '#14B8A6',
    '#FFFFFF'
  ),
  ('Dance', 'Dance', 'Танцы', '#E879F9', '#171717'),
  ('Other', 'Other', 'Другое', '#F3F4F6', '#171717'),
  (
    'Workshop',
    'Workshop',
    'Воркшоп',
    '#F97316',
    '#FFFFFF'
  ),
  ('Event', 'Event', 'Событие', '#0EA5E7', '#FFFFFF')
ON CONFLICT ("name_en") DO UPDATE SET
  "name_vn" = EXCLUDED."name_vn",
  "name_ru" = EXCLUDED."name_ru",
  "chip_bg_hex" = EXCLUDED."chip_bg_hex",
  "chip_fg_hex" = EXCLUDED."chip_fg_hex";

-- Remap trainings from legacy category names to new rows.
UPDATE "Training" AS t
SET "trainingCategoryId" = (
  CASE (
    SELECT c."name_en"
    FROM "TrainingCategory" c
    WHERE c.id = t."trainingCategoryId"
  )
    WHEN 'Yoga & Pilates' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Yoga' LIMIT 1
    )
    WHEN 'Gym & Strength' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Strength' LIMIT 1
    )
    WHEN 'Cardio, HIIT & Cycling' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Recovery' LIMIT 1
    )
    WHEN 'Dance' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Dance' LIMIT 1
    )
    WHEN 'Martial arts' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Other' LIMIT 1
    )
    WHEN 'Swimming' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Recovery' LIMIT 1
    )
    WHEN 'Racket sports' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Other' LIMIT 1
    )
    WHEN 'Personal training' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Strength' LIMIT 1
    )
    WHEN 'Other' THEN (
      SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Other' LIMIT 1
    )
    ELSE t."trainingCategoryId"
  END
)
WHERE t."trainingCategoryId" IS NOT NULL;

UPDATE "Training" AS t
SET "trainingCategoryId" = (
  SELECT id FROM "TrainingCategory" WHERE "name_en" = 'Other' LIMIT 1
)
WHERE t."trainingCategoryId" IS NOT NULL
  AND t."trainingCategoryId" NOT IN (
    SELECT id
    FROM "TrainingCategory"
    WHERE "name_en" IN (
        'Yoga',
        'Pilates',
        'Stretching',
        'Strength',
        'Meditation',
        'Recovery',
        'Dance',
        'Other',
        'Workshop',
        'Event'
      )
  );

DELETE FROM "TrainingCategory"
WHERE "name_en" NOT IN (
    'Yoga',
    'Pilates',
    'Stretching',
    'Strength',
    'Meditation',
    'Recovery',
    'Dance',
    'Other',
    'Workshop',
    'Event'
  );

ALTER TABLE "TrainingCategory" DROP COLUMN IF EXISTS "main_category_id";

COMMIT;
