CREATE TABLE IF NOT EXISTS user_avatars (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  mime_type text NOT NULL CHECK (mime_type = 'image/webp'),
  image bytea NOT NULL CHECK (octet_length(image) BETWEEN 1 AND 524288),
  width integer NOT NULL CHECK (width = 512),
  height integer NOT NULL CHECK (height = 512),
  updated_at timestamptz NOT NULL DEFAULT now()
);
