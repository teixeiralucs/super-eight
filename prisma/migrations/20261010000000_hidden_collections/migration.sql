-- Coleções escondidas por usuário.
-- CreateEnum
CREATE TYPE "CollectionSource" AS ENUM ('TMDB', 'TRAKT');

-- CreateTable
CREATE TABLE "HiddenCollection" (
    "userId" UUID NOT NULL,
    "source" "CollectionSource" NOT NULL,
    "collectionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenCollection_pkey" PRIMARY KEY ("userId","source","collectionId")
);

-- AddForeignKey
ALTER TABLE "HiddenCollection" ADD CONSTRAINT "HiddenCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "HiddenCollection" ENABLE ROW LEVEL SECURITY;
