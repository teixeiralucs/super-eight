-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LIST_COMMENT';
ALTER TYPE "NotificationType" ADD VALUE 'LIST_REPLY';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "listId" UUID,
ALTER COLUMN "reviewId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_listId_createdAt_idx" ON "Comment"("listId", "createdAt");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Exatamente um alvo: review ou lista.
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_one_target_check" CHECK (num_nonnulls("reviewId", "listId") = 1);
