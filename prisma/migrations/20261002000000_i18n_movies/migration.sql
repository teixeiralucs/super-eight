-- Filmes multilíngues (earlySetup.md §3.3): título original em destaque + traduções pt/en/es,
-- pôster por idioma e gêneros por ID do TMDb. Renomeia em vez de apagar para não perder dados;
-- as colunas novas são preenchidas por `npm run movies:backfill-i18n`.

-- O cache antigo era em pt-BR.
ALTER TABLE "Movie" RENAME COLUMN "title" TO "titlePt";
ALTER TABLE "Movie" ALTER COLUMN "titlePt" DROP NOT NULL;
ALTER TABLE "Movie" RENAME COLUMN "posterPath" TO "posterPt";

ALTER TABLE "Movie"
  ADD COLUMN "originalLanguage" TEXT,
  ADD COLUMN "titleEn" TEXT,
  ADD COLUMN "titleEs" TEXT,
  ADD COLUMN "posterEn" TEXT,
  ADD COLUMN "posterEs" TEXT,
  ADD COLUMN "genreIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Nomes de gênero em português dão lugar aos IDs; sinopse vem sempre do TMDb no idioma certo.
ALTER TABLE "Movie" DROP COLUMN "genres", DROP COLUMN "overview";

-- Preferências do usuário (nulo = automático).
ALTER TABLE "User" ADD COLUMN "locale" TEXT, ADD COLUMN "region" TEXT;
