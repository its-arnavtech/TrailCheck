-- CreateTable
CREATE TABLE "ParkSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parkId" INTEGER NOT NULL,
    "npsRaw" JSONB,
    "nwsRaw" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParkSnapshot_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ParkSnapshot_parkId_idx" ON "ParkSnapshot"("parkId");

-- CreateIndex
CREATE INDEX "ParkSnapshot_createdAt_idx" ON "ParkSnapshot"("createdAt");
