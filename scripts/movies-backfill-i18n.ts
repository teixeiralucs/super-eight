/**
 * Preenche/atualiza o cache `Movie` com título original, traduções pt/en/es, pôster e logo
 * por idioma, IDs de gênero e a coleção (saga), renovando também o cache `Collection` (earlySetup.md §3.3). Rode depois da migração i18n e sempre que
 * quiser renovar os metadados:
 *
 *   npm run movies:backfill-i18n
 */
import { prisma } from './db';
import {
	collectionFields,
	localizedLogos,
	toCollection,
	toImages,
	toMovieCache,
	type RawCollection,
	type RawImages,
	type RawMovieForCache
} from '../src/lib/server/tmdb-normalize';

const token = process.env.TMDB_READ_ACCESS_TOKEN;
if (!token) throw new Error('TMDB_READ_ACCESS_TOKEN não definida (.env).');

async function tmdb<T>(path: string, params: Record<string, string> = {}) {
	const url = new URL(`https://api.themoviedb.org/3${path}`);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
	});
	if (!response.ok) throw new Error(`TMDb ${response.status} em ${path}`);
	return (await response.json()) as T;
}

async function fetchMovie(id: number) {
	const [raw, images] = await Promise.all([
		tmdb<RawMovieForCache>(`/movie/${id}`, {
			language: 'en-US',
			append_to_response: 'credits,translations,images',
			include_image_language: 'pt,en,es'
		}),
		// Logos em todos os idiomas: a padrão é a do idioma original (ex.: japonês).
		tmdb<RawImages>(`/movie/${id}/images`)
	]);
	const data = toMovieCache(raw);
	return { ...data, logos: localizedLogos(toImages(images.logos ?? []), data.originalLanguage) };
}

/** Coleções já renovadas nesta execução (vários filmes da mesma saga). */
const collections = new Map<number, Promise<number | null>>();

function saveCollection(id: number) {
	let saved = collections.get(id);
	if (!saved) {
		saved = (async () => {
			const [pt, en, es] = await Promise.all(
				['pt-BR', 'en-US', 'es-MX'].map((language) =>
					tmdb<RawCollection>(`/collection/${id}`, { language })
				)
			);
			const fields = collectionFields(toCollection({ pt, en, es }));
			await prisma.collection.upsert({ where: { id }, create: { id, ...fields }, update: fields });
			return id;
		})().catch((err) => {
			console.error(`coleção ${id}:`, String(err));
			return null;
		});
		collections.set(id, saved);
	}
	return saved;
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
				const collectionId = data.collectionId ? await saveCollection(data.collectionId) : null;
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
						logoPt: data.logos.pt,
						logoEn: data.logos.en,
						logoEs: data.logos.es,
						backdropPath: data.backdropPath,
						genreIds: data.genreIds,
						directors: data.directors,
						countries: data.countries,
						runtime: data.runtime,
						imdbId: data.imdbId,
						collectionId
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

console.log(
	`✔ ${done} atualizados, ${collections.size} coleções${failures.length ? `, falharam: ${failures.join(', ')}` : ''}`
);
await prisma.$disconnect();
