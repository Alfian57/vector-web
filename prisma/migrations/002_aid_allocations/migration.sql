BEGIN;

CREATE TABLE aid_allocations (
  id uuid PRIMARY KEY,
  district_id text NOT NULL REFERENCES districts(id),
  item text NOT NULL CHECK (char_length(item) BETWEEN 1 AND 100),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  unit text NOT NULL CHECK (char_length(unit) BETWEEN 1 AND 30),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 600),
  author_id text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aid_allocations_recent_idx ON aid_allocations (created_at DESC, id DESC);

CREATE TABLE aid_deliveries (
  allocation_id uuid NOT NULL REFERENCES aid_allocations(id),
  id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  recipient text NOT NULL CHECK (char_length(recipient) BETWEEN 1 AND 100),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 600),
  author_id text NOT NULL REFERENCES "user"(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (allocation_id, id)
);
CREATE INDEX aid_deliveries_recent_idx ON aid_deliveries (allocation_id, recorded_at DESC, id DESC);

COMMIT;
