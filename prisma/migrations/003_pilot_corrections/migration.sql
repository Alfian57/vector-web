BEGIN;

ALTER TABLE alerts ADD COLUMN request_id uuid;
ALTER TABLE alerts ADD CONSTRAINT alerts_author_request_key UNIQUE (author_id, request_id);

CREATE TABLE follow_up_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id text NOT NULL REFERENCES districts(id),
  kind text NOT NULL CHECK (kind IN ('outreach', 'assistance')),
  status text NOT NULL CHECK (status IN ('planned', 'complete')),
  note text NOT NULL,
  author_id text NOT NULL REFERENCES "user"(id),
  recorded_at timestamptz NOT NULL
);
INSERT INTO follow_up_entries (district_id, kind, status, note, author_id, recorded_at)
SELECT district_id, kind, status, note, author_id, updated_at FROM follow_ups;
CREATE INDEX follow_up_entries_recent_idx ON follow_up_entries (recorded_at DESC, id DESC);

ALTER TABLE reports ADD COLUMN review_revision integer NOT NULL DEFAULT 0;
UPDATE reports SET review_revision = 1 WHERE status <> 'pending';
CREATE TABLE report_review_history (
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  status report_status NOT NULL CHECK (status <> 'pending'),
  finding finding NOT NULL,
  severity severity,
  note text,
  reason text,
  reviewer_id text REFERENCES "user"(id),
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (report_id, revision)
);
INSERT INTO report_review_history (report_id, revision, status, finding, severity, note, reviewer_id, recorded_at)
SELECT id, review_revision, status, finding, severity, review_note, reviewer_id, COALESCE(reviewed_at, submitted_at)
FROM reports WHERE review_revision = 1;

ALTER TABLE aid_allocations ADD COLUMN revision integer NOT NULL DEFAULT 0, ADD COLUMN original_input jsonb;
UPDATE aid_allocations SET original_input = jsonb_build_object(
  'districtId', district_id, 'item', item, 'quantity', quantity, 'unit', unit, 'note', note
);

ALTER TABLE aid_deliveries ADD COLUMN revision integer NOT NULL DEFAULT 0,
  ADD COLUMN voided_at timestamptz, ADD COLUMN original_input jsonb;
UPDATE aid_deliveries SET original_input = jsonb_build_object('recipient', recipient, 'quantity', quantity, 'note', note);

CREATE TABLE aid_corrections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  allocation_id uuid NOT NULL REFERENCES aid_allocations(id),
  delivery_id uuid,
  kind text NOT NULL CHECK (kind IN ('allocation', 'delivery', 'void-delivery')),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 600),
  previous jsonb NOT NULL,
  current jsonb NOT NULL,
  author_id text NOT NULL REFERENCES "user"(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (allocation_id, delivery_id) REFERENCES aid_deliveries(allocation_id, id)
);
CREATE INDEX aid_corrections_recent_idx ON aid_corrections (allocation_id, id DESC);

COMMIT;
