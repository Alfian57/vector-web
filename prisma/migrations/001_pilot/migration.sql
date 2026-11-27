BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "user" (
  id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL,
  "emailVerified" boolean NOT NULL DEFAULT false, image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  role text NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'officer'))
);

CREATE TABLE session (
  id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text UNIQUE NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX ON session ("userId");

CREATE TABLE account (
  id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz, scope text, password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON account ("userId");

CREATE TABLE verification (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON verification (identifier);
CREATE TABLE "rateLimit" (id text PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, "lastRequest" bigint NOT NULL);

CREATE TABLE districts (
  id text PRIMARY KEY,
  name text NOT NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX districts_geom_gix ON districts USING gist (geom);

CREATE TYPE finding AS ENUM ('unknown', 'healthy', 'blast', 'blight', 'tungro', 'planthopper', 'brown_spot');
CREATE TYPE report_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE severity AS ENUM ('mild', 'moderate', 'severe');

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  owner_id text NOT NULL REFERENCES "user"(id),
  payload_digest text NOT NULL,
  district_id text NOT NULL REFERENCES districts(id),
  geom geometry(Point, 4326) NOT NULL,
  observed_at timestamptz NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  notes text NOT NULL,
  finding finding NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  severity severity,
  reviewer_id text REFERENCES "user"(id),
  review_note text,
  reviewed_at timestamptz,
  UNIQUE (owner_id, client_id)
);
CREATE INDEX reports_observed_idx ON reports (observed_at, finding) WHERE status = 'verified';
CREATE INDEX reports_inbox_idx ON reports (status, submitted_at DESC);
CREATE INDEX reports_owner_idx ON reports (owner_id, submitted_at DESC);

CREATE TABLE report_photos (
  report_id uuid PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
  image bytea NOT NULL CHECK (octet_length(image) BETWEEN 1 AND 1500000)
);
CREATE TABLE plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES "user"(id),
  district_id text NOT NULL REFERENCES districts(id),
  geom geometry(Point, 4326) NOT NULL,
  name text NOT NULL
);
CREATE INDEX plots_district_idx ON plots (district_id, owner_id);
CREATE INDEX plots_owner_idx ON plots (owner_id);

CREATE TABLE radar_state (
  only_row boolean PRIMARY KEY DEFAULT true CHECK (only_row),
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO radar_state DEFAULT VALUES;
CREATE TABLE radar_counts (
  district_id text NOT NULL REFERENCES districts(id),
  finding finding NOT NULL,
  count integer NOT NULL,
  clustered boolean NOT NULL,
  PRIMARY KEY (district_id, finding)
);

CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id text NOT NULL REFERENCES districts(id),
  finding finding,
  author_id text REFERENCES "user"(id),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE alert_recipients (
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  owner_id text NOT NULL REFERENCES "user"(id),
  read_at timestamptz,
  PRIMARY KEY (alert_id, owner_id)
);
CREATE INDEX alert_inbox_idx ON alert_recipients (owner_id, alert_id);

CREATE TABLE push_subscriptions (
  endpoint text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  keys jsonb NOT NULL
);
CREATE INDEX push_owner_idx ON push_subscriptions (owner_id);
CREATE TABLE push_jobs (
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  endpoint text NOT NULL REFERENCES push_subscriptions(endpoint) ON DELETE CASCADE,
  owner_id text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz,
  PRIMARY KEY (alert_id, endpoint)
);
CREATE INDEX push_pending_idx ON push_jobs (next_attempt_at) WHERE done_at IS NULL;

CREATE TABLE follow_ups (
  district_id text NOT NULL REFERENCES districts(id),
  kind text NOT NULL CHECK (kind IN ('outreach', 'assistance')),
  status text NOT NULL CHECK (status IN ('planned', 'complete')),
  note text NOT NULL,
  author_id text NOT NULL REFERENCES "user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (district_id, kind)
);
CREATE TABLE local_weather (
  only_row boolean PRIMARY KEY DEFAULT true CHECK (only_row),
  observed_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL,
  wind_speed real NOT NULL,
  wind_direction real NOT NULL,
  humidity real NOT NULL
);

COMMIT;
