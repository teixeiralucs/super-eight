import { fail, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import type { Prisma } from '$lib/server/generated/prisma/client';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { addToLibrary } from '$lib/server/library-actions';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { m } from '$lib/paraglide/messages';
import type { Locale } from '$lib/i18n';
import type { CollectionDetail, CollectionSource, CollectionSummary } from '$lib/lists/types';
import type { CollectionPart } from '$lib/tmdb/types';

/**
 * Coleções (earlySetup.md §6.8), só leitura: sagas do TMDb e listas oficiais do Trakt. Cada
 * usuário vê as que têm algum filme da biblioteca dele, com os filmes dele e os que faltam
 * ("fantasmas").
 */

const NAME = { pt: 'namePt', en: 'nameEn', es: 'nameEs' } as const;
type NamedRow = { namePt: string | null; nameEn: string; nameEs: string | null };
const nameOf = (row: NamedRow, locale: Locale) => row[NAME[locale]] ?? row.nameEn;

/** Parecidas demais: 80% ou mais dos filmes em comum (Jaccard). */
function overlaps(a: number[], b: number[]) {
	const set = new Set(a);
	const shared = b.filter((id) => set.has(id)).length;
	return shared / (a.length + b.length - shared) >= 0.8;
}

/**
 * Coleções com pelo menos um filme na biblioteca: as mais completas primeiro. Listas do
 * Trakt que repetem uma saga do TMDb (ex.: "Toy Story Collection") ou outra lista do Trakt
 * com os mesmos filmes ficam de fora.
 */
export async function getUserCollections(
	userId: string,
	locale: Locale
): Promise<CollectionSummary[]> {
	const entries = await prisma.libraryEntry.findMany({
		where: { userId },
		select: { movie: { select: { id: true, collectionId: true, backdropPath: true } } }
	});
	if (!entries.length) return [];
	const library = new Map(entries.map(({ movie }) => [movie.id, movie]));

	const collectionIds = [...new Set(entries.flatMap(({ movie }) => movie.collectionId ?? []))];
	const [sagas, lists, artworks] = await Promise.all([
		prisma.collection.findMany({
			where: { id: { in: collectionIds } },
			select: {
				id: true,
				namePt: true,
				nameEn: true,
				nameEs: true,
				backdropPath: true,
				partIds: true
			}
		}),
		prisma.traktList.findMany({
			where: { partIds: { hasSome: [...library.keys()] } },
			orderBy: { id: 'asc' },
			select: { id: true, name: true, partIds: true }
		}),
		getArtworks(userId)
	]);

	const summaries: CollectionSummary[] = sagas.map((row) => {
		const owned = entries.filter(({ movie }) => movie.collectionId === row.id).length;
		return {
			source: 'tmdb',
			id: row.id,
			name: nameOf(row, locale),
			owned,
			// A biblioteca pode ter um filme que saiu da coleção no TMDb: nunca "5 de 4".
			total: Math.max(row.partIds.length, owned),
			backdropPath: row.backdropPath
		};
	});

	const kept: number[][] = [];
	for (const list of lists) {
		const repeats =
			sagas.some((saga) => overlaps(saga.partIds, list.partIds)) ||
			kept.some((other) => overlaps(other, list.partIds));
		if (repeats) continue;
		kept.push(list.partIds);
		const owned = list.partIds.filter((id) => library.has(id));
		// Sem imagem no Trakt: o fundo (com o DNA do usuário) do 1º filme da lista que ele tem.
		const first = owned.find((id) => library.get(id)?.backdropPath) ?? owned[0];
		const cover = withArtwork(
			{ id: first, posterPath: null, backdropPath: library.get(first)?.backdropPath ?? null },
			artworks
		);
		summaries.push({
			source: 'trakt',
			id: list.id,
			name: list.name,
			owned: owned.length,
			total: list.partIds.length,
			backdropPath: cover.backdropPath
		});
	}

	return summaries.sort(
		(a, b) =>
			b.owned / b.total - a.owned / a.total ||
			b.owned - a.owned ||
			a.name.localeCompare(b.name, locale)
	);
}

interface CollectionBase {
	source: CollectionSource;
	id: number;
	name: string;
	description: string | null;
	backdropPath: string | null;
	partIds: number[];
	parts: Prisma.JsonValue;
}

/** Monta a página de uma coleção: filmes da biblioteca (`where`) + os que faltam. */
async function buildDetail(
	userId: string,
	locale: Locale,
	base: CollectionBase,
	where: Prisma.MovieWhereInput
): Promise<CollectionDetail> {
	const entries = await prisma.libraryEntry.findMany({
		where: { userId, movie: where },
		select: {
			status: true,
			rating: true,
			isFavorite: true,
			movie: { select: movieCardSelect }
		}
	});
	const movieIds = entries.map((entry) => entry.movie.id);
	const [sessions, artworks] = await Promise.all([
		prisma.diaryEntry.groupBy({
			by: ['movieId'],
			where: { userId, movieId: { in: movieIds } },
			_count: { _all: true },
			_max: { watchedAt: true }
		}),
		getArtworks(userId, movieIds)
	]);
	const diary = new Map(sessions.map((s) => [s.movieId, s]));
	const owned = new Set(movieIds);
	const items = entries.map((entry) => ({
		movie: withArtwork(localizeCard(entry.movie, locale), artworks),
		library: {
			status: entry.status,
			rating: entry.rating,
			isFavorite: entry.isFavorite,
			watchCount: diary.get(entry.movie.id)?._count._all ?? 0
		},
		lastWatched: diary.get(entry.movie.id)?._max.watchedAt ?? null
	}));
	// Sem fundo próprio (listas do Trakt): o do primeiro filme da lista que o usuário tem.
	const firstOwned = base.partIds
		.map((id) => items.find((item) => item.movie.id === id))
		.find((item) => item?.movie.backdropPath);

	return {
		source: base.source,
		id: base.id,
		name: base.name,
		description: base.description,
		total: Math.max(base.partIds.length, entries.length),
		backdropPath: base.backdropPath ?? firstOwned?.movie.backdropPath ?? null,
		items,
		// JSON gravado por `collectionFields`/`traktListFields` (formato CollectionPart).
		missing: (base.parts as unknown as CollectionPart[])
			.filter((part) => !owned.has(part.id))
			.map((part) => ({
				id: part.id,
				title: part.titles[locale] ?? part.originalTitle,
				originalTitle: part.originalTitle,
				posterPath: part.posters[locale] ?? part.posters.en,
				releaseDate: part.releaseDate ? new Date(`${part.releaseDate}T00:00:00Z`) : null
			}))
	};
}

/** Saga do TMDb com os filmes do usuário (nula = coleção desconhecida). */
export async function getUserCollection(userId: string, id: number, locale: Locale) {
	const row = await prisma.collection.findUnique({ where: { id } });
	if (!row) return null;
	return buildDetail(
		userId,
		locale,
		{ ...row, source: 'tmdb', name: nameOf(row, locale), description: null },
		{ collectionId: id }
	);
}

/** Lista oficial do Trakt com os filmes do usuário (nula = lista desconhecida). */
export async function getUserTraktList(userId: string, id: number, locale: Locale) {
	const row = await prisma.traktList.findUnique({ where: { id } });
	if (!row) return null;
	return buildDetail(
		userId,
		locale,
		{
			...row,
			source: 'trakt',
			backdropPath: null,
			// Listas gravadas antes do filtro de `toTraktList` podem repetir o nome.
			description: row.description !== row.name ? row.description : null
		},
		{ id: { in: row.partIds } }
	);
}

const addSchema = z.object({ movieId: z.coerce.number().int().positive() });

/** Action das páginas de coleção: adiciona um fantasma em "Quero ver". */
export async function addMissing({ request, locals, fetch }: RequestEvent) {
	if (!locals.user) return fail(401, { message: m.error_sign_in_to_add() });
	const parsed = addSchema.safeParse(Object.fromEntries(await request.formData()));
	if (!parsed.success) return fail(400, { message: m.error_invalid_movie() });
	await addToLibrary(locals.user.id, parsed.data.movieId, fetch);
	return { added: parsed.data.movieId };
}
