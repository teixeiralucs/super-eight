-- IDs do TMDb (pessoas por função e estúdios) para os filtros da biblioteca.
-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "castIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "composerIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "directorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "studioIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "writerIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

