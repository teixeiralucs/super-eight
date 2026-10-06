import { prisma } from '$lib/server/db';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { getCompany, getGenreNames, getPerson } from '$lib/server/tmdb';
import {
	computeInsights,
	sessionYears,
	type InsightEntry,
	type InsightMovie,
	type InsightPeriod,
	type RankItem
} from '$lib/library/insights';
import type { Locale } from '$lib/i18n';
import type { LibraryItem } from '$lib/library/types';

/**
 * Estatísticas do usuário (earlySetup.md §6.11): o cálculo é puro ($lib/library/insights);
 * aqui entram o banco e os nomes/fotos do TMDb para pessoas, estúdios e gêneros.
 */

export interface NamedRank extends RankItem<number> {
	name: string;
	/** Foto da pessoa ou logo do estúdio. */
	imagePath: string | null;
}

/** Período pedido na URL (`?year=2025` ou `?year=all`); sem pedido, o ano atual (se tiver sessões). */
export function parsePeriod(param: string | null, years: number[]): InsightPeriod {
	if (param === 'all') return 'all';
	const year = Number(param);
	if (param && years.includes(year)) return year;
	const current = new Date().getUTCFullYear();
	return years.includes(current) ? current : 'all';
}

async function named(
	items: RankItem<number>[],
	lookup: (id: number) => Promise<{ name: string; imagePath: string | null }>
): Promise<NamedRank[]> {
	const resolved = await Promise.all(
		items.map(async (item) => {
			const found = await lookup(item.key).catch(() => null);
			return found ? { ...item, ...found } : null;
		})
	);
	return resolved.filter((item) => item !== null);
}

export async function getInsights(
	userId: string,
	periodParam: string | null,
	locale: Locale,
	fetchFn?: typeof fetch
) {
	const [sessions, library] = await Promise.all([
		prisma.diaryEntry.findMany({
			where: { userId },
			select: { movieId: true, watchedAt: true, isRewatch: true }
		}),
		prisma.libraryEntry.findMany({
			where: { userId },
			select: { movieId: true, status: true, rating: true, isFavorite: true }
		})
	]);
	const years = sessionYears(sessions);
	const period = parsePeriod(periodParam, years);

	const ids = [...new Set(sessions.map((s) => s.movieId))];
	const rows = await prisma.movie.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			runtime: true,
			releaseDate: true,
			genreIds: true,
			countries: true,
			originalLanguage: true,
			directorIds: true,
			writerIds: true,
			castIds: true,
			composerIds: true,
			studioIds: true
		}
	});
	const movies = new Map<number, InsightMovie>(
		rows.map(({ releaseDate, ...movie }) => [
			movie.id,
			{ ...movie, releaseYear: releaseDate?.getUTCFullYear() ?? null }
		])
	);
	const entries = new Map<number, InsightEntry>(library.map((entry) => [entry.movieId, entry]));
	const insights = computeInsights(sessions, movies, entries, period);

	const person = (id: number) =>
		getPerson(id, locale, fetchFn).then((p) => ({ name: p.name, imagePath: p.profilePath }));
	const studio = (id: number) =>
		getCompany(id, fetchFn).then((c) => ({ name: c.name, imagePath: c.logoPath }));
	const { highlights } = insights;
	const highlightIds = [
		...new Set(
			[
				...highlights.topRated,
				highlights.longest,
				highlights.oldest,
				highlights.mostWatched?.movieId,
				highlights.first?.movieId,
				highlights.last?.movieId
			].filter((id) => id != null)
		)
	];

	const [director, cast, writer, composer, studios, genreNames, cardRows, artworks] =
		await Promise.all([
			named(insights.ranks.director, person),
			named(insights.ranks.cast, person),
			named(insights.ranks.writer, person),
			named(insights.ranks.composer, person),
			named(insights.ranks.studio, studio),
			getGenreNames(locale, fetchFn).catch(() => new Map<number, string>()),
			prisma.movie.findMany({ where: { id: { in: highlightIds } }, select: movieCardSelect }),
			getArtworks(userId, highlightIds)
		]);

	const sessionCounts = new Map<number, number>();
	for (const session of sessions) {
		sessionCounts.set(session.movieId, (sessionCounts.get(session.movieId) ?? 0) + 1);
	}
	const libraryById = new Map(library.map((entry) => [entry.movieId, entry]));
	const cards: Record<number, LibraryItem> = {};
	for (const row of cardRows) {
		const entry = libraryById.get(row.id);
		cards[row.id] = {
			status: entry?.status ?? 'WATCHED',
			rating: entry?.rating ?? null,
			isFavorite: entry?.isFavorite ?? false,
			watchCount: sessionCounts.get(row.id) ?? 0,
			movie: withArtwork(localizeCard(row, locale), artworks)
		};
	}

	return {
		years,
		period,
		insights: {
			...insights,
			ranks: {
				...insights.ranks,
				genre: insights.ranks.genre.flatMap((item) => {
					const name = genreNames.get(item.key);
					return name ? [{ ...item, name }] : [];
				})
			}
		},
		people: { director, cast, writer, composer },
		studios,
		cards
	};
}
