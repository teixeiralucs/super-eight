import type { Prisma } from '$lib/server/generated/prisma/client';
import type { Locale } from '$lib/i18n';
import type { MovieCard } from '$lib/library/types';

/** Colunas do cache `Movie` que um card precisa (todas as traduções; escolhemos depois). */
export const movieCardSelect = {
	id: true,
	originalTitle: true,
	titlePt: true,
	titleEn: true,
	titleEs: true,
	posterPt: true,
	posterEn: true,
	posterEs: true,
	backdropPath: true,
	releaseDate: true,
	runtime: true,
	genreIds: true,
	directors: true,
	countries: true
} satisfies Prisma.MovieSelect;

export type MovieCardRow = Prisma.MovieGetPayload<{ select: typeof movieCardSelect }>;

const TITLE = { pt: 'titlePt', en: 'titleEn', es: 'titleEs' } as const;
const POSTER = { pt: 'posterPt', en: 'posterEn', es: 'posterEs' } as const;

/**
 * Linha do cache → card no idioma de quem vê. `title` é a tradução (ou o original, se não
 * houver); `originalTitle` é sempre o original — a UI destaca o original (§6.5).
 */
export function localizeCard(row: MovieCardRow, locale: Locale): MovieCard {
	const originalTitle = row.originalTitle ?? row.titleEn ?? row.titlePt ?? '';
	return {
		id: row.id,
		title: row[TITLE[locale]] ?? originalTitle,
		originalTitle,
		posterPath: row[POSTER[locale]] ?? row.posterEn ?? row.posterPt ?? row.posterEs,
		backdropPath: row.backdropPath,
		releaseDate: row.releaseDate,
		runtime: row.runtime,
		genreIds: row.genreIds,
		directors: row.directors,
		countries: row.countries
	};
}
