-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "directors" TEXT[] DEFAULT ARRAY[]::TEXT[];
