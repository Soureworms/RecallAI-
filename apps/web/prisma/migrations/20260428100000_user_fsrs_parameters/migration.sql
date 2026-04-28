-- CreateTable
CREATE TABLE "UserFSRSParameters" (
    "id"                  TEXT NOT NULL,
    "userId"              TEXT NOT NULL,
    "parameters"          JSONB NOT NULL,
    "logLoss"             DOUBLE PRECISION,
    "rmseBins"            DOUBLE PRECISION,
    "reviewCount"         INTEGER NOT NULL DEFAULT 0,
    "learningStepsSecs"   JSONB,
    "relearningStepsSecs" JSONB,
    "lastOptimizedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFSRSParameters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFSRSParameters_userId_key" ON "UserFSRSParameters"("userId");

-- AddForeignKey
ALTER TABLE "UserFSRSParameters" ADD CONSTRAINT "UserFSRSParameters_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
