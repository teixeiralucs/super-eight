import { prisma } from '$lib/server/db';
import { m } from '$lib/paraglide/messages';
import { ensureMovie } from '$lib/server/movies';
import { getMovieImages } from '$lib/server/tmdb';
import { LibraryRuleError } from '$lib/server/errors';
import { artworkField, type Artwork, type ArtworkKind } from '$lib/movie/types';

/**
 * "DNA" visual dos filmes: pôster/fundo que o usuário escolheu na galeria.
 * Toda tela da área logada passa os filmes por `withArtwork` antes de entregar ao cliente.
 */
export async function getArtworks(userId: string, movieIds?: number[]) {
	const rows = await prisma.movieArtwork.findMany({
		where: { userId, ...(movieIds && { movieId: { in: movieIds } }) },
		select: { movieId: true, posterPath: true, backdropPath: true, logoPath: true }
	});
	return new Map<number, Artwork>(rows.map(({ movieId, ...art }) => [movieId, art]));
}

/** Troca pôster/fundo pelos escolhidos (o que não foi personalizado fica como está). */
export function withArtwork<T extends { id: number; posterPath: string | null }>(
	movie: T,
	artworks: Map<number, Artwork>
): T {
	const art = artworks.get(movie.id);
	if (!art) return movie;
	return {
		...movie,
		posterPath: art.posterPath ?? movie.posterPath,
		...('backdropPath' in movie && { backdropPath: art.backdropPath ?? movie.backdropPath })
	};
}

/** Define (ou, com `path` nulo, restaura) o pôster/fundo/logo do filme para o usuário. */
export async function setArtwork(
	userId: string,
	movieId: number,
	kind: ArtworkKind,
	path: string | null,
	fetchFn?: typeof fetch
) {
	if (path) {
		const images = await getMovieImages(movieId, fetchFn);
		const options = { poster: images.posters, backdrop: images.backdrops, logo: images.logos }[
			kind
		];
		if (!options.some((image) => image.path === path)) {
			throw new LibraryRuleError(m.error_image_not_found());
		}
	}

	const current = await prisma.movieArtwork.findUnique({
		where: { userId_movieId: { userId, movieId } },
		select: { posterPath: true, backdropPath: true, logoPath: true }
	});
	const next: Artwork = {
		posterPath: null,
		backdropPath: null,
		logoPath: null,
		...current,
		[artworkField(kind)]: path
	};

	if (!next.posterPath && !next.backdropPath && !next.logoPath) {
		await prisma.movieArtwork.deleteMany({ where: { userId, movieId } });
		return;
	}

	await ensureMovie(movieId, fetchFn);
	await prisma.movieArtwork.upsert({
		where: { userId_movieId: { userId, movieId } },
		create: { userId, movieId, ...next },
		update: next
	});
}
