/**
 * Restaura um backup de biblioteca (ver library-backup.ts). Pode rodar mais de uma vez:
 * filmes e sessões que já existem não são duplicados; estados e imagens são sobrescritos
 * pelos do backup.
 *
 *   npm run library:restore -- backups/<username>-latest.json [username-de-destino]
 */
import { readFile } from 'node:fs/promises';
import { prisma, type LibraryBackup } from './db';

const [file, target] = process.argv.slice(2);
if (!file) {
	console.error('Uso: npm run library:restore -- <arquivo.json> [username]');
	process.exit(1);
}

const backup: LibraryBackup = JSON.parse(await readFile(file, 'utf8'));
if (backup.version !== 1) throw new Error(`Versão de backup desconhecida: ${backup.version}`);

const username = target ?? backup.username;
const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
if (!user) {
	console.error(`Usuário "${username}" não encontrado (crie a conta antes de restaurar).`);
	process.exit(1);
}
const userId = user.id;

await prisma.$transaction(
	async (tx) => {
		// Filmes primeiro (as outras tabelas apontam para eles); os que já existem ficam como estão.
		await tx.movie.createMany({
			data: backup.movies.map((movie) => ({
				...movie,
				releaseDate: movie.releaseDate ? new Date(movie.releaseDate) : null,
				createdAt: new Date(movie.createdAt),
				updatedAt: new Date(movie.updatedAt)
			})),
			skipDuplicates: true
		});

		for (const entry of backup.library) {
			const data = {
				status: entry.status,
				rating: entry.rating,
				isFavorite: entry.isFavorite,
				addedAt: new Date(entry.addedAt)
			};
			await tx.libraryEntry.upsert({
				where: { userId_movieId: { userId, movieId: entry.movieId } },
				create: { userId, movieId: entry.movieId, ...data },
				update: data
			});
		}

		await tx.diaryEntry.createMany({
			data: backup.diary.map((entry) => ({
				...entry,
				// Restaurando em outra conta: ids novos (o id é global).
				...(target && target !== backup.username && { id: undefined }),
				userId,
				watchedAt: new Date(`${entry.watchedAt}T00:00:00Z`),
				createdAt: new Date(entry.createdAt)
			})),
			skipDuplicates: true
		});

		for (const art of backup.artworks) {
			const data = { posterPath: art.posterPath, backdropPath: art.backdropPath };
			await tx.movieArtwork.upsert({
				where: { userId_movieId: { userId, movieId: art.movieId } },
				create: { userId, movieId: art.movieId, ...data },
				update: data
			});
		}
	},
	{ timeout: 60_000 }
);

console.log(
	`✔ Restaurado em @${username}: ${backup.library.length} filmes, ${backup.diary.length} sessões, ${backup.artworks.length} imagens`
);
await prisma.$disconnect();
