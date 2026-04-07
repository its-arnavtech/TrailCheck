-- CreateTable
CREATE TABLE "UserParkPreference" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "parkId" INTEGER NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "wantsToGo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserParkPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserParkPreference_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserParkPreference_userId_idx" ON "UserParkPreference"("userId");

-- CreateIndex
CREATE INDEX "UserParkPreference_parkId_idx" ON "UserParkPreference"("parkId");

-- CreateIndex
CREATE UNIQUE INDEX "UserParkPreference_userId_parkId_key" ON "UserParkPreference"("userId", "parkId");
