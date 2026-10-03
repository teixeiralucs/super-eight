-- Coleções do TMDb (sagas) e o vínculo de cada filme.
-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "collectionId" INTEGER;

-- CreateTable
CREATE TABLE "Collection" (
    "id" INTEGER NOT NULL,
    "namePt" TEXT,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "partIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movie_collectionId_idx" ON "Movie"("collectionId");

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Como as demais tabelas: acesso só pelo servidor (Prisma), nunca pela API pública do Supabase.
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
