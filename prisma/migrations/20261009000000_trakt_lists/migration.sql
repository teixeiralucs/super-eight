-- Listas oficiais do Trakt como coleções.
-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "imdbId" TEXT,
ADD COLUMN     "traktCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TraktList" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "partIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "parts" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraktList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TraktList_partIds_idx" ON "TraktList" USING GIN ("partIds");


ALTER TABLE "TraktList" ENABLE ROW LEVEL SECURITY;
