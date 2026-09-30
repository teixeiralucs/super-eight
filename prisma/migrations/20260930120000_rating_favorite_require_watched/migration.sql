-- Regra de negócio (earlySetup.md §3.4): só filmes assistidos podem ter nota ou ser favoritos.
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_rating_favorite_require_watched_check"
  CHECK ("status" = 'WATCHED' OR ("rating" IS NULL AND "isFavorite" = false));
