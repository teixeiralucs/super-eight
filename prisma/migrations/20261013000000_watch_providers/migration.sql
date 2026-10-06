-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "watchCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "streamingServices" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
CREATE TABLE "MovieWatch" (
    "movieId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "link" TEXT,
    "flatrate" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "free" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "rent" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "buy" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieWatch_pkey" PRIMARY KEY ("movieId","region")
);

-- CreateTable
CREATE TABLE "WatchProvider" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logoPath" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 999,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovieWatch_region_idx" ON "MovieWatch"("region");

-- AddForeignKey
ALTER TABLE "MovieWatch" ADD CONSTRAINT "MovieWatch_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Tabelas só acessadas pelo servidor (Prisma): RLS ligado, sem políticas.
ALTER TABLE "MovieWatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WatchProvider" ENABLE ROW LEVEL SECURITY;
