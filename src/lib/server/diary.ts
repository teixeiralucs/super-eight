import { prisma } from '$lib/server/db';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import type { Locale } from '$lib/i18n';
import type { DiaryLogEntry } from '$lib/diary/types';
import type { LibraryState } from '$lib/library/types';

/**
 * Diário completo do usuário: todas as sessões, sempre da mais recente para a mais antiga
 * (data assistida; no mesmo dia, a registrada por último primeiro). Cada filme vem com o
 * DNA visual do usuário e o estado atual na biblioteca.
 */
export async function getDiary(userId: string, locale: Locale): Promise<DiaryLogEntry[]> {
	const [sessions, library, artworks] = await Promise.all([
		prisma.diaryEntry.findMany({
			where: { userId },
			orderBy: [{ watchedAt: 'desc' }, { createdAt: 'desc' }],
			select: {
				id: true,
				watchedAt: true,
				rating: true,
				isRewatch: true,
				note: true,
				createdAt: true,
				movie: { select: movieCardSelect }
			}
		}),
		prisma.libraryEntry.findMany({
			where: { userId },
			select: { movieId: true, status: true, rating: true, isFavorite: true }
		}),
		getArtworks(userId)
	]);

	const watchCounts = new Map<number, number>();
	for (const session of sessions) {
		watchCounts.set(session.movie.id, (watchCounts.get(session.movie.id) ?? 0) + 1);
	}
	const states = new Map<number, LibraryState>(
		library.map(({ movieId, ...state }) => [
			movieId,
			{ ...state, watchCount: watchCounts.get(movieId) ?? 0 }
		])
	);

	return sessions.map((session) => ({
		...session,
		movie: withArtwork(localizeCard(session.movie, locale), artworks),
		library: states.get(session.movie.id) ?? null
	}));
}
