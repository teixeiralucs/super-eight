import { prisma } from '$lib/server/db';
import type { Prisma } from '$lib/server/generated/prisma/client';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { getLibraryGrid } from '$lib/server/library';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { getCompany, getGenreNames, getPerson } from '$lib/server/tmdb';
import type { Locale } from '$lib/i18n';
import type { Facet, PersonRole } from '$lib/library/facets';
import type { LibraryFilters, LibraryView } from '$lib/library/filters';
import type { LibraryItem } from '$lib/library/types';

/**
 * Páginas filtradas da biblioteca (earlySetup.md §6.10): os filmes do usuário de uma pessoa
 * (por função), país, idioma original, gênero, estúdio ou dia de lançamento.
 */

const ROLE_FIELD = {
	director: 'directorIds',
	writer: 'writerIds',
	cast: 'castIds',
	composer: 'composerIds'
} as const;

/** Filmes de uma pessoa: numa função ou em qualquer uma. */
function personWhere(id: number, role: PersonRole): Prisma.MovieWhereInput {
	if (role !== 'all') return { [ROLE_FIELD[role]]: { has: id } };
	return { OR: Object.values(ROLE_FIELD).map((field) => ({ [field]: { has: id } })) };
}

/** Filmes da biblioteca lançados num dia/mês ("12-25"), de qualquer ano. */
async function releaseMovieIds(userId: string, monthDay: string) {
	const rows = await prisma.$queryRaw<{ id: number }[]>`
		SELECT m.id FROM "Movie" m
		JOIN "LibraryEntry" le ON le."movieId" = m.id AND le."userId" = ${userId}::uuid
		WHERE to_char(m."releaseDate", 'MM-DD') = ${monthDay}`;
	return rows.map((row) => row.id);
}

/** Onde procurar (filtro de filme) para cada tipo de página. */
async function movieWhereFor(
	userId: string,
	facet: Facet,
	value: string,
	role: PersonRole
): Promise<Prisma.MovieWhereInput> {
	switch (facet) {
		case 'person':
			return personWhere(Number(value), role);
		case 'country':
			return { countries: { has: value } };
		case 'language':
			return { originalLanguage: value };
		case 'genre':
			return { genreIds: { has: Number(value) } };
		case 'studio':
			return { studioIds: { has: Number(value) } };
		case 'release':
			return { id: { in: await releaseMovieIds(userId, value) } };
	}
}

/** Quantos filmes em cada aba (Todos, Assistidos, Quero ver, Favoritos) — como no dashboard. */
async function viewCounts(userId: string, movie: Prisma.MovieWhereInput) {
	const [byStatus, favorites] = await Promise.all([
		prisma.libraryEntry.groupBy({
			by: ['status'],
			where: { userId, movie },
			_count: { _all: true }
		}),
		prisma.libraryEntry.count({ where: { userId, movie, isFavorite: true } })
	]);
	const of = (status: 'WATCHED' | 'WANT_TO_WATCH') =>
		byStatus.find((row) => row.status === status)?._count._all ?? 0;
	return {
		all: of('WATCHED') + of('WANT_TO_WATCH'),
		watched: of('WATCHED'),
		watchlist: of('WANT_TO_WATCH'),
		favorites
	} satisfies Record<LibraryView, number>;
}

/** Quantos filmes da pessoa em cada função (os filmes podem contar em mais de uma). */
async function roleCounts(userId: string, id: number) {
	const entries = await Promise.all(
		(['all', 'director', 'writer', 'cast', 'composer'] as const).map(
			async (role) =>
				[
					role,
					await prisma.libraryEntry.count({ where: { userId, movie: personWhere(id, role) } })
				] as const
		)
	);
	return Object.fromEntries(entries) as Record<PersonRole, number>;
}

export type FacetHeader =
	| { facet: 'person'; name: string; imagePath: string | null; department: string | null }
	| { facet: 'studio'; name: string; imagePath: string | null; country: string | null }
	| { facet: 'genre'; name: string }
	| { facet: 'country' | 'language' | 'release'; code: string };

async function headerFor(
	facet: Facet,
	value: string,
	locale: Locale,
	fetchFn?: typeof fetch
): Promise<FacetHeader | null> {
	switch (facet) {
		case 'person': {
			const person = await getPerson(Number(value), locale, fetchFn).catch(() => null);
			return person
				? {
						facet,
						name: person.name,
						imagePath: person.profilePath,
						department: person.department
					}
				: null;
		}
		case 'studio': {
			const company = await getCompany(Number(value), fetchFn).catch(() => null);
			return company
				? { facet, name: company.name, imagePath: company.logoPath, country: company.country }
				: null;
		}
		case 'genre': {
			const name = (await getGenreNames(locale, fetchFn)).get(Number(value));
			return name ? { facet, name } : null;
		}
		default:
			return { facet, code: value };
	}
}

/** Página com a grade (igual ao dashboard). Nula = pessoa/estúdio/gênero inexistente. */
export async function getFacetPage(
	userId: string,
	facet: Facet,
	value: string,
	filters: LibraryFilters,
	role: PersonRole,
	locale: Locale,
	fetchFn?: typeof fetch
) {
	const [header, movieWhere] = await Promise.all([
		headerFor(facet, value, locale, fetchFn),
		movieWhereFor(userId, facet, value, role)
	]);
	if (!header) return null;
	const [grid, total, roles] = await Promise.all([
		getLibraryGrid(userId, filters, locale, movieWhere),
		viewCounts(userId, movieWhere),
		facet === 'person' ? roleCounts(userId, Number(value)) : null
	]);
	// `total`: filmes da página sem filtros (cabeçalho); `counts`: abas com os filtros aplicados.
	return {
		header,
		library: grid.items as LibraryItem[],
		counts: grid.counts,
		total: total.all,
		roles
	};
}

/**
 * Lançamentos de um dia (ex.: 25 de dezembro) na biblioteca, por ano — mais recentes
 * primeiro, como o diário.
 */
export async function getReleaseDay(userId: string, monthDay: string, locale: Locale) {
	const ids = await releaseMovieIds(userId, monthDay);
	const [entries, sessions, artworks] = await Promise.all([
		prisma.libraryEntry.findMany({
			where: { userId, movieId: { in: ids } },
			orderBy: [{ movie: { releaseDate: 'desc' } }, { movie: { originalTitle: 'asc' } }],
			select: { status: true, rating: true, isFavorite: true, movie: { select: movieCardSelect } }
		}),
		prisma.diaryEntry.groupBy({
			by: ['movieId'],
			where: { userId, movieId: { in: ids } },
			_count: { _all: true }
		}),
		getArtworks(userId, ids)
	]);
	const watchCounts = new Map(sessions.map((row) => [row.movieId, row._count._all]));
	const years: { year: number; items: LibraryItem[] }[] = [];
	for (const entry of entries) {
		const year = entry.movie.releaseDate!.getUTCFullYear();
		let group = years.at(-1);
		if (group?.year !== year) years.push((group = { year, items: [] }));
		group.items.push({
			...entry,
			movie: withArtwork(localizeCard(entry.movie, locale), artworks),
			watchCount: watchCounts.get(entry.movie.id) ?? 0
		});
	}
	return years;
}
