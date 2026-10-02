-- CreateEnum
CREATE TYPE "ListKind" AS ENUM ('RANKED', 'COLLECTION');

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "kind" "ListKind" NOT NULL DEFAULT 'COLLECTION';
