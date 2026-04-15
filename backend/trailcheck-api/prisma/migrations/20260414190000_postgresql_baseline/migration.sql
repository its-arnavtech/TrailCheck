-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TrailStatus" AS ENUM ('OPEN', 'CAUTION', 'CLOSED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');

-- CreateEnum
CREATE TYPE "HazardType" AS ENUM ('SNOW', 'ROCKFALL', 'FLOODING', 'MUD', 'ICE', 'CLOSURE');

-- CreateEnum
CREATE TYPE "HazardSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "HazardSource" AS ENUM ('USER', 'NPS');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "Park" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Park_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trail" (
    "id" SERIAL NOT NULL,
    "parkId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lengthMiles" DOUBLE PRECISION,
    "difficulty" "Difficulty",
    "status" "TrailStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,

    CONSTRAINT "Trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hazard" (
    "id" SERIAL NOT NULL,
    "trailId" INTEGER NOT NULL,
    "type" "HazardType" NOT NULL,
    "severity" "HazardSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" "HazardSource" NOT NULL DEFAULT 'USER',
    "externalId" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailReport" (
    "id" SERIAL NOT NULL,
    "trailId" INTEGER NOT NULL,
    "conditionRating" INTEGER NOT NULL,
    "surfaceCondition" TEXT NOT NULL,
    "note" TEXT,
    "reporterName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'OTHER',
    "age" INTEGER NOT NULL DEFAULT 18,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserParkPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "parkId" INTEGER NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "wantsToGo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserParkPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkSnapshot" (
    "id" SERIAL NOT NULL,
    "parkId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "npsRaw" JSONB NOT NULL,
    "nwsRaw" JSONB NOT NULL,
    "geminiReply" TEXT,

    CONSTRAINT "ParkSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Park_slug_key" ON "Park"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Trail_slug_key" ON "Trail"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserParkPreference_userId_idx" ON "UserParkPreference"("userId");

-- CreateIndex
CREATE INDEX "UserParkPreference_parkId_idx" ON "UserParkPreference"("parkId");

-- CreateIndex
CREATE UNIQUE INDEX "UserParkPreference_userId_parkId_key" ON "UserParkPreference"("userId", "parkId");

-- AddForeignKey
ALTER TABLE "Trail" ADD CONSTRAINT "Trail_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hazard" ADD CONSTRAINT "Hazard_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailReport" ADD CONSTRAINT "TrailReport_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserParkPreference" ADD CONSTRAINT "UserParkPreference_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserParkPreference" ADD CONSTRAINT "UserParkPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkSnapshot" ADD CONSTRAINT "ParkSnapshot_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
