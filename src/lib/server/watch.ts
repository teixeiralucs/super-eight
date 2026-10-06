import { prisma } from '$lib/server/db';
import { toWatchRows } from '$lib/server/tmdb-normalize';
import { getWatchProviders } from '$lib/server/tmdb';
import type { WatchProviderInfo } from '$lib/tmdb/types';

/**
 * Onde assistir (earlySetup.md §6.12): a tela do filme lê ao vivo do TMDb; o cache
 * `MovieWatch` (todas as regiões) alimenta o filtro "Disponível em" da biblioteca e é
 * renovado pela rotina diária e quando o filme entra no cache.
 */

/** Busca e grava as opções do filme em todas as regiões (substitui as anteriores). */
export async function refreshWatch(movieId: number, fetchFn?: typeof fetch) {
	const { regions, providers } = toWatchRows(await getWatchProviders(movieId, fetchFn));
	await prisma.$transaction([
		// Serviços novos entram; os conhecidos ficam (nome/logo mudam raramente).
		prisma.watchProvider.createMany({ data: providers, skipDuplicates: true }),
		prisma.movieWatch.deleteMany({ where: { movieId } }),
		prisma.movieWatch.createMany({ data: regions.map((row) => ({ movieId, ...row })) }),
		prisma.movie.update({ where: { id: movieId }, data: { watchCheckedAt: new Date() } })
	]);
}

export async function getStreamingServices(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { streamingServices: true }
	});
	return user?.streamingServices ?? [];
}

export function setStreamingServices(userId: string, ids: number[]) {
	return prisma.user.update({
		where: { id: userId },
		data: { streamingServices: [...new Set(ids)] }
	});
}

/**
 * Serviços de streaming (assinatura ou grátis) que têm algum filme da biblioteca na região,
 * do mais relevante ao menos — as opções do filtro "Disponível em".
 */
export async function libraryProviders(
	userId: string,
	region: string
): Promise<WatchProviderInfo[]> {
	return prisma.$queryRaw<WatchProviderInfo[]>`
		SELECT p.id, p.name, p."logoPath"
		FROM "WatchProvider" p
		WHERE p.id IN (
			SELECT unnest(w.flatrate || w.free)
			FROM "MovieWatch" w
			JOIN "LibraryEntry" le ON le."movieId" = w."movieId" AND le."userId" = ${userId}::uuid
			WHERE w.region = ${region}
		)
		ORDER BY p.priority, p.name`;
}
