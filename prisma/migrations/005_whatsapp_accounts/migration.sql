BEGIN;

ALTER TABLE "user"
  ADD COLUMN "phoneNumber" text,
  ADD COLUMN "phoneNumberVerified" boolean DEFAULT false;
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user" ("phoneNumber");

COMMIT;
