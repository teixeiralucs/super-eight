import { prisma } from '$lib/server/db';
import { ensureMovie } from '$lib/server/movies';
import type { SessionInput } from '$lib/schemas/library';
import type { LibraryState } from '$lib/library/types';
import type { DiarySessionRow, MovieUserData } from '$lib/movie/types';

/** Violação de regra de negócio (vira `fail(400)` na action). */
export class LibraryRuleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'LibraryRuleError';
	}
}

/** Estado do usuário com um filme: biblioteca + todas as sessões do diário. */
export async function getMovieUserData(userId: string, movieId: number): Promise<MovieUserData> {
	const [entry, sessions] = await Promise.all([
		prisma.libraryEntry.findUnique({
			where: { userId_movieId: { userId, movieId } },
			select: { status: true, rating: true, isFavorite: true }
		}),
		prisma.diaryEntry.findMany({
			where: { userId, movieId },
			orderBy: [{ watchedAt: 'desc' }, { createdAt: 'desc' }],
			select: { id: true, watchedAt: true, rating: true, isRewatch: true, note: true }
		})
	]);

	const library: LibraryState | null = entry ? { ...entry, watchCount: sessions.length } : null;
	return { library, sessions: sessions satisfies DiarySessionRow[] };
}

const key = (userId: string, movieId: number) => ({ userId_movieId: { userId, movieId } });

async function requireWatched(userId: string, movieId: number) {
	const entry = await prisma.libraryEntry.findUnique({
		where: key(userId, movieId),
		select: { status: true, isFavorite: true }
	});
	if (entry?.status !== 'WATCHED') {
		throw new LibraryRuleError('Marque o filme como assistido primeiro.');
	}
	return entry;
}

/** Define o status. Voltar para "Quero ver" limpa nota e favorito (regra §3.4.4). */
export async function setStatus(
	userId: string,
	movieId: number,
	status: 'WANT_TO_WATCH' | 'WATCHED',
	fetchFn?: typeof fetch
) {
	await ensureMovie(movieId, fetchFn);
	const reset = status === 'WANT_TO_WATCH' ? { rating: null, isFavorite: false } : {};
	await prisma.libraryEntry.upsert({
		where: key(userId, movieId),
		create: { userId, movieId, status },
		update: { status, ...reset }
	});
}

export async function removeFromLibrary(userId: string, movieId: number) {
	// O diário é histórico: as sessões permanecem.
	await prisma.libraryEntry.deleteMany({ where: { userId, movieId } });
}

export async function rate(userId: string, movieId: number, rating: number | null) {
	await requireWatched(userId, movieId);
	await prisma.libraryEntry.update({ where: key(userId, movieId), data: { rating } });
}

export async function toggleFavorite(userId: string, movieId: number) {
	const entry = await requireWatched(userId, movieId);
	await prisma.libraryEntry.update({
		where: key(userId, movieId),
		data: { isFavorite: !entry.isFavorite }
	});
}

/**
 * Registra uma sessão no diário e marca o filme como assistido (regra §3.4.3).
 * É rewatch se já havia sessão; a nota informada também vira a nota atual.
 */
export async function logSession(
	userId: string,
	movieId: number,
	input: SessionInput,
	fetchFn?: typeof fetch
) {
	await ensureMovie(movieId, fetchFn);
	await prisma.$transaction(async (tx) => {
		const previous = await tx.diaryEntry.count({ where: { userId, movieId } });
		await tx.diaryEntry.create({
			data: {
				userId,
				movieId,
				watchedAt: new Date(`${input.watchedAt}T00:00:00Z`),
				rating: input.rating,
				note: input.note,
				isRewatch: previous > 0
			}
		});
		const rating = input.rating !== null ? { rating: input.rating } : {};
		await tx.libraryEntry.upsert({
			where: key(userId, movieId),
			create: { userId, movieId, status: 'WATCHED', ...rating },
			update: { status: 'WATCHED', ...rating }
		});
	});
}

export async function deleteSession(userId: string, sessionId: string) {
	// deleteMany com userId: nunca apaga sessão de outra pessoa.
	const { count } = await prisma.diaryEntry.deleteMany({ where: { id: sessionId, userId } });
	if (!count) throw new LibraryRuleError('Sessão não encontrada.');
}
