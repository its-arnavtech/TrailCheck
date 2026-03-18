-- CreateTable
CREATE TABLE "Park" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Trail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parkId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lengthMiles" REAL,
    "difficulty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    CONSTRAINT "Trail_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hazard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trailId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hazard_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrailReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trailId" INTEGER NOT NULL,
    "conditionRating" INTEGER NOT NULL,
    "surfaceCondition" TEXT NOT NULL,
    "note" TEXT,
    "reporterName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrailReport_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Park_slug_key" ON "Park"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Trail_slug_key" ON "Trail"("slug");
