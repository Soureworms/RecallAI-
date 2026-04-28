-- CreateEnum
CREATE TYPE "StudyMode" AS ENUM ('AUTO_ROTATE', 'MANUAL');

-- AlterTable: add studyMode to Organization
ALTER TABLE "Organization" ADD COLUMN "studyMode" "StudyMode" NOT NULL DEFAULT 'AUTO_ROTATE';

-- AlterTable: add inRotation to Deck
ALTER TABLE "Deck" ADD COLUMN "inRotation" BOOLEAN NOT NULL DEFAULT true;
