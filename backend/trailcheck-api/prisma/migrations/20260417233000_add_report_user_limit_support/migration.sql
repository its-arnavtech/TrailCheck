ALTER TABLE "TrailReport"
ADD COLUMN "userId" INTEGER;

CREATE INDEX "TrailReport_userId_createdAt_idx" ON "TrailReport"("userId", "createdAt");

ALTER TABLE "TrailReport"
ADD CONSTRAINT "TrailReport_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
