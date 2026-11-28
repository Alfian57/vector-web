BEGIN;

ALTER TABLE education_articles ADD COLUMN IF NOT EXISTS thumbnail_image_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS education_articles_thumbnail_image_id_key
  ON education_articles (thumbnail_image_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'education_articles'::regclass
      AND conname = 'education_articles_thumbnail_image_id_fkey'
  ) THEN
    ALTER TABLE education_articles ADD CONSTRAINT education_articles_thumbnail_image_id_fkey
      FOREIGN KEY (thumbnail_image_id) REFERENCES education_images(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
