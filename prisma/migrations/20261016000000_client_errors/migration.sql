-- CreateTable
CREATE TABLE "ClientError" (
    "id" UUID NOT NULL,
    "signature" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "url" TEXT NOT NULL,
    "route" TEXT,
    "source" TEXT NOT NULL,
    "userAgent" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientError_signature_key" ON "ClientError"("signature");

-- CreateIndex
CREATE INDEX "ClientError_lastSeen_idx" ON "ClientError"("lastSeen" DESC);


-- Só o servidor (Prisma) acessa: RLS ligado, sem políticas.
ALTER TABLE "ClientError" ENABLE ROW LEVEL SECURITY;
