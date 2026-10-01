-- CreateTable
CREATE TABLE "MovieArtwork" (
    "userId" UUID NOT NULL,
    "movieId" INTEGER NOT NULL,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieArtwork_pkey" PRIMARY KEY ("userId","movieId")
);

-- AddForeignKey
ALTER TABLE "MovieArtwork" ADD CONSTRAINT "MovieArtwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieArtwork" ADD CONSTRAINT "MovieArtwork_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS como nas demais tabelas: sem políticas = nada exposto pela API pública do Supabase
-- (o app acessa pelo Prisma, no servidor).
ALTER TABLE "MovieArtwork" ENABLE ROW LEVEL SECURITY;
