-- Dados das partes de cada coleção (filmes "fantasmas" que o usuário ainda não tem).
ALTER TABLE "Collection" ADD COLUMN "parts" JSONB NOT NULL DEFAULT '[]';
