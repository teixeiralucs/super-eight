-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('WANT_TO_WATCH', 'WATCHED');

-- CreateEnum
CREATE TYPE "CatalogType" AS ENUM ('POPULAR', 'NOW_PLAYING');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "overview" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "releaseDate" DATE,
    "runtime" INTEGER,
    "genres" TEXT[],
    "voteAverage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryEntry" (
    "userId" UUID NOT NULL,
    "movieId" INTEGER NOT NULL,
    "status" "WatchStatus" NOT NULL,
    "rating" INTEGER,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "movieId" INTEGER NOT NULL,
    "watchedAt" DATE NOT NULL,
    "rating" INTEGER,
    "isRewatch" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListMovie" (
    "listId" UUID NOT NULL,
    "movieId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListMovie_pkey" PRIMARY KEY ("listId","movieId")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "movieId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "containsSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" UUID NOT NULL,
    "followingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "ReviewLike" (
    "userId" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLike_pkey" PRIMARY KEY ("userId","reviewId")
);

-- CreateTable
CREATE TABLE "ListLike" (
    "userId" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListLike_pkey" PRIMARY KEY ("userId","listId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogEntry" (
    "type" "CatalogType" NOT NULL,
    "position" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogEntry_pkey" PRIMARY KEY ("type","position")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "LibraryEntry_userId_status_idx" ON "LibraryEntry"("userId", "status");

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_watchedAt_idx" ON "DiaryEntry"("userId", "watchedAt" DESC);

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_movieId_idx" ON "DiaryEntry"("userId", "movieId");

-- CreateIndex
CREATE INDEX "List_userId_idx" ON "List"("userId");

-- CreateIndex
CREATE INDEX "ListMovie_listId_position_idx" ON "ListMovie"("listId", "position");

-- CreateIndex
CREATE INDEX "Review_movieId_createdAt_idx" ON "Review"("movieId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_movieId_key" ON "Review"("userId", "movieId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Comment_reviewId_createdAt_idx" ON "Comment"("reviewId", "createdAt");

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListMovie" ADD CONSTRAINT "ListMovie_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListMovie" ADD CONSTRAINT "ListMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLike" ADD CONSTRAINT "ReviewLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLike" ADD CONSTRAINT "ReviewLike_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListLike" ADD CONSTRAINT "ListLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListLike" ADD CONSTRAINT "ListLike_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogEntry" ADD CONSTRAINT "CatalogEntry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ════════════════════════════════════════════════════════════════════
-- SQL manual (não gerado pelo Prisma)
-- ════════════════════════════════════════════════════════════════════

-- Notas de 1 a 10 (earlySetup.md §3.1.4)
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_rating_check" CHECK ("rating" BETWEEN 1 AND 10);
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_rating_check" CHECK ("rating" BETWEEN 1 AND 10);

-- Ninguém segue a si mesmo
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_not_self_check" CHECK ("followerId" <> "followingId");

-- Sincronização auth.users → public."User" (earlySetup.md §5.1.3)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := lower(regexp_replace(
    coalesce(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'
  ));

  INSERT INTO public."User" ("id", "email", "username", "name", "avatarUrl", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'username' IS NOT NULL THEN base_username
      ELSE left(base_username, 20) || '_' || substr(md5(random()::text), 1, 6)
    END,
    coalesce(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    now()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public."User" SET "email" = NEW.email, "updatedAt" = now() WHERE "id" = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public."User" WHERE "id" = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_auth_user_email_change();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_deleted();

-- As funções não devem ser chamáveis pela API REST do Supabase
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_deleted() FROM PUBLIC, anon, authenticated;

-- RLS sem políticas: bloqueia acesso via API REST (anon/authenticated).
-- O Prisma conecta como dono das tabelas e não é afetado (earlySetup.md §5.1.5).
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Movie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LibraryEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiaryEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "List" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListMovie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatalogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
