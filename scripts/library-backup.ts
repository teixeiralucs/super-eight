/**
 * Exporta a biblioteca de um usuário (filmes, estados, diário e imagens escolhidas).
 *
 *   npm run library:backup -- <username>
 *
 * Gera backups/<username>-<data>.json e backups/<username>-latest.json.
 * A pasta `backups/` fica fora do git (tem dados pessoais).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma, type LibraryBackup } from './db';

const username = process.argv[2];
if (!username) {
	console.error('Uso: npm run library:backup -- <username>');
	process.exit(1);
}

const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
if (!user) {
	console.error(`Usuário "${username}" não encontrado.`);
	process.exit(1);
}

const [library, diary, artworks] = await Promise.all([
	prisma.libraryEntry.findMany({ where: { userId: user.id }, orderBy: { addedAt: 'asc' } }),
	prisma.diaryEntry.findMany({ where: { userId: user.id }, orderBy: { watchedAt: 'asc' } }),
	prisma.movieArtwork.findMany({ where: { userId: user.id } })
]);

const movieIds = [...new Set([...library, ...diary, ...artworks].map((row) => row.movieId))];
const movies = await prisma.movie.findMany({ where: { id: { in: movieIds } } });

const backup: LibraryBackup = {
	version: 1,
	exportedAt: new Date().toISOString(),
	username,
	tmdbIds: library.map((entry) => entry.movieId),
	movies,
	library: library.map((entry) => ({
		movieId: entry.movieId,
		status: entry.status,
		rating: entry.rating,
		isFavorite: entry.isFavorite,
		addedAt: entry.addedAt.toISOString()
	})),
	diary: diary.map((entry) => ({
		id: entry.id,
		movieId: entry.movieId,
		watchedAt: entry.watchedAt.toISOString().slice(0, 10),
		rating: entry.rating,
		isRewatch: entry.isRewatch,
		note: entry.note,
		createdAt: entry.createdAt.toISOString()
	})),
	artworks: artworks.map(({ movieId, posterPath, backdropPath }) => ({
		movieId,
		posterPath,
		backdropPath
	}))
};

await mkdir('backups', { recursive: true });
const json = JSON.stringify(backup, null, '\t');
const dated = `backups/${username}-${backup.exportedAt.slice(0, 10)}.json`;
await writeFile(dated, json);
await writeFile(`backups/${username}-latest.json`, json);

console.log(
	`✔ ${library.length} filmes, ${diary.length} sessões, ${artworks.length} imagens → ${dated}`
);
await prisma.$disconnect();
