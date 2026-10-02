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

/**
 * Linha do backup → colunas atuais de `Movie`. Backups antigos (antes do i18n) tinham
 * `title`/`posterPath` em pt-BR e `genres` por nome: viram `titlePt`/`posterPt`; os demais
 * campos traduzidos ficam vazios até `npm run movies:backfill-i18n`.
 */
function toMovieRow(row: Record<string, unknown>) {
	const value = <T>(key: string) => (row[key] ?? null) as T;
	const date = (key: string) => (row[key] ? new Date(row[key] as string) : null);
	return {
		id: row.id as number,
		originalTitle: value<string | null>('originalTitle'),
		originalLanguage: value<string | null>('originalLanguage'),
		titlePt: value<string | null>('titlePt') ?? value<string | null>('title'),
		titleEn: value<string | null>('titleEn'),
		titleEs: value<string | null>('titleEs'),
		posterPt: value<string | null>('posterPt') ?? value<string | null>('posterPath'),
		posterEn: value<string | null>('posterEn'),
		posterEs: value<string | null>('posterEs'),
		backdropPath: value<string | null>('backdropPath'),
		releaseDate: date('releaseDate'),
		runtime: value<number | null>('runtime'),
		genreIds: value<number[] | null>('genreIds') ?? [],
		directors: value<string[] | null>('directors') ?? [],
		countries: value<string[] | null>('countries') ?? [],
		voteAverage: value<number | null>('voteAverage'),
		createdAt: date('createdAt') ?? new Date(),
		updatedAt: date('updatedAt') ?? new Date()
	};
}
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
		await tx.movie.createMany({ data: backup.movies.map(toMovieRow), skipDuplicates: true });

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
