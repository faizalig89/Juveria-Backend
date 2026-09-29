-- Juveria Phase 3B: Google identity binding for existing users and trial admins.
ALTER TABLE "User"
ADD COLUMN "googleSubject" TEXT;

ALTER TABLE "User"
ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_googleSubject_key"
ON "User"("googleSubject");
