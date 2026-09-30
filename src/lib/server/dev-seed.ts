import { prisma } from '$lib/server/db';
import { ensureMovie } from '$lib/server/movies';
import { getNowPlaying, getPopular } from '$lib/server/tmdb';

// FERRAMENTA DE DESENVOLVIMENTO: popula a biblioteca do usuário com dados de exemplo
// para visualizar o dashboard. As actions que chamam isto recusam rodar fora de `dev`.

const DAY = 24 * 60 * 60 * 1000;

/** Pseudo-aleatório determinístico (mesma semente → mesmos dados). */
function random(seed: number) {
	const x = Math.sin(seed * 9301 + 49297) * 233280;
	return x - Math.floor(x);
}

export async function seedDemoLibrary(userId: string, fetchFn?: typeof fetch) {
	// Atualiza metadados (direção, país…) dos filmes que já estão na biblioteca.
	const existing = await prisma.libraryEntry.findMany({
		where: { userId },
		select: { movieId: true }
	});
	for (const { movieId } of existing) await ensureMovie(movieId, fetchFn);

	const [popular, nowPlaying] = await Promise.all([getPopular(fetchFn), getNowPlaying(fetchFn)]);
	const picks = [...new Map([...popular, ...nowPlaying].map((m) => [m.id, m])).values()].slice(
		0,
		18
	);

	const now = Date.now();
	let index = 0;

	for (const pick of picks) {
		const movie = await ensureMovie(pick.id, fetchFn);
		const i = index++;
		const watched = i < 12;
		const rating = watched ? 5 + Math.round(random(i) * 5) : null;

		await prisma.libraryEntry.upsert({
			where: { userId_movieId: { userId, movieId: movie.id } },
			create: {
				userId,
				movieId: movie.id,
				status: watched ? 'WATCHED' : 'WANT_TO_WATCH',
				rating,
				isFavorite: watched && rating !== null && rating >= 9
			},
			update: {}
		});

		if (!watched) continue;
		const alreadyLogged = await prisma.diaryEntry.count({ where: { userId, movieId: movie.id } });
		if (alreadyLogged) continue;

		// Sessões entre o lançamento (ou 11 meses atrás) e hoje.
		const earliest = Math.max(movie.releaseDate?.getTime() ?? 0, now - 330 * DAY);
		const sessions = random(i + 100) > 0.75 ? 2 : 1;
		for (let s = 0; s < sessions; s++) {
			const at = earliest + random(i * 7 + s) * (now - earliest);
			await prisma.diaryEntry.create({
				data: {
					userId,
					movieId: movie.id,
					watchedAt: new Date(new Date(at).toISOString().slice(0, 10)),
					rating,
					isRewatch: s > 0
				}
			});
		}
	}

	return picks.length;
}

export async function clearLibrary(userId: string) {
	await prisma.$transaction([
		prisma.diaryEntry.deleteMany({ where: { userId } }),
		prisma.libraryEntry.deleteMany({ where: { userId } })
	]);
}
