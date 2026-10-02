/**
 * Preenche/atualiza o cache `Movie` com título original, traduções pt/en/es, pôster por
 * idioma e IDs de gênero (earlySetup.md §3.3). Rode depois da migração i18n e sempre que
 * quiser renovar os metadados:
 *
 *   npm run movies:backfill-i18n
 */
import { prisma } from './db';
import { toMovieCache, type RawMovieForCache } from '../src/lib/server/tmdb-normalize';

const token = process.env.TMDB_READ_ACCESS_TOKEN;
if (!token) throw new Error('TMDB_READ_ACCESS_TOKEN não definida (.env).');

async function fetchMovie(id: number) {
	const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
	url.searchParams.set('language', 'en-US');
	url.searchParams.set('append_to_response', 'credits,translations,images');
	url.searchParams.set('include_image_language', 'pt,en,es');
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
	});
	if (!response.ok) throw new Error(`TMDb ${response.status} no filme ${id}`);
	return toMovieCache((await response.json()) as RawMovieForCache);
}

const movies = await prisma.movie.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
console.log(`${movies.length} filmes no cache…`);

let done = 0;
const failures: number[] = [];
const queue = [...movies];
// Poucas requisições simultâneas: o TMDb limita por segundo.
await Promise.all(
	Array.from({ length: 4 }, async () => {
		for (let movie = queue.shift(); movie; movie = queue.shift()) {
			try {
				const data = await fetchMovie(movie.id);
				await prisma.movie.update({
					where: { id: movie.id },
					data: {
						originalTitle: data.originalTitle,
						originalLanguage: data.originalLanguage,
						titlePt: data.titles.pt,
						titleEn: data.titles.en,
						titleEs: data.titles.es,
						posterPt: data.posters.pt,
						posterEn: data.posters.en,
						posterEs: data.posters.es,
						backdropPath: data.backdropPath,
						genreIds: data.genreIds,
						directors: data.directors,
						countries: data.countries,
						runtime: data.runtime
					}
				});
				done++;
			} catch (err) {
				failures.push(movie.id);
				console.error(String(err));
			}
		}
	})
);

console.log(`✔ ${done} atualizados${failures.length ? `, falharam: ${failures.join(', ')}` : ''}`);
await prisma.$disconnect();
