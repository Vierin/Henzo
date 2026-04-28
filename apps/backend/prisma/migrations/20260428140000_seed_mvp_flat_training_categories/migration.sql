-- MVP variant A: flat TrainingCategory rows (no hierarchy). Idempotent via name_en.
INSERT INTO "TrainingCategory" ("name_en", "name_vn", "name_ru", "main_category_id") VALUES
  ('Yoga & Pilates', 'Yoga và Pilates', 'Йога и пилатес', NULL),
  ('Gym & Strength', 'Gym và thể lực', 'Фитнес и силовые', NULL),
  ('Cardio, HIIT & Cycling', 'Cardio, HIIT và đạp xe', 'Кардио, HIIT и велотренировки', NULL),
  ('Dance', 'Khiêu vũ', 'Танцы', NULL),
  ('Martial arts', 'Võ thuật', 'Боевые искусства', NULL),
  ('Swimming', 'Bơi lội', 'Плавание', NULL),
  ('Racket sports', 'Thể thao vợt', 'Ракеточные виды спорта', NULL),
  ('Personal training', 'Huấn luyện viên cá nhân', 'Персональный тренинг', NULL),
  ('Other', 'Khác', 'Другое', NULL)
ON CONFLICT ("name_en") DO NOTHING;
