BEGIN;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "banReason" text,
  ADD COLUMN IF NOT EXISTS "banExpires" timestamptz;
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check CHECK (role IN ('farmer', 'officer', 'admin'));
ALTER TABLE session ADD COLUMN IF NOT EXISTS "impersonatedBy" text;

CREATE TABLE IF NOT EXISTS education_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE,
  title text NOT NULL, category text NOT NULL, summary text NOT NULL, content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE INDEX IF NOT EXISTS education_articles_published_idx ON education_articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS education_articles_category_idx ON education_articles (category, status);

CREATE TABLE IF NOT EXISTS education_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), article_id uuid NOT NULL REFERENCES education_articles(id) ON DELETE CASCADE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  image bytea NOT NULL CHECK (octet_length(image) BETWEEN 1 AND 5000000),
  width integer NOT NULL CHECK (width BETWEEN 1 AND 4000), height integer NOT NULL CHECK (height BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS education_images_article_idx ON education_images (article_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('audit', 'system')),
  category text NOT NULL, action text NOT NULL, outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure')),
  severity text CHECK (severity IS NULL OR severity IN ('warn', 'error')),
  actor_id text REFERENCES "user"(id) ON DELETE SET NULL, actor_role text,
  target_type text, target_id text, summary text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_recent_idx ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_actor_idx ON activity_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_kind_idx ON activity_logs (kind, created_at DESC);

CREATE TABLE IF NOT EXISTS worker_job_status (
  job text PRIMARY KEY, last_attempt_at timestamptz NOT NULL DEFAULT now(), last_success_at timestamptz,
  last_error_code text, updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
