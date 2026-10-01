import { TMDB_READ_ACCESS_TOKEN } from '$env/static/private';
import type {
	CrewMember,
	MovieImage,
	MovieImages,
	TMDbMovie,
	TMDbMovieDetails,
	TMDbMovieFull,
	Trailer
} from '$lib/tmdb/types';

const API_BASE = 'https://api.themoviedb.org/3';
const LANGUAGE = 'pt-BR';
const REGION = 'BR';

/** Catálogos mudam poucas vezes ao dia; gêneros quase nunca. */
const CATALOG_TTL_MS = 30 * 60 * 1000;
const GENRES_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Formatos crus do TMDb (apenas os campos que lemos) ──────────────
interface RawMovie {
	id: number;
	title: string;
	original_title: string;
	overview: string;
	poster_path: string | null;
	backdrop_path: string | null;
	release_date: string;
	vote_average: number;
	genre_ids: number[];
	adult: boolean;
	softcore?: boolean;
}

interface RawPage<T> {
	page: number;
	results: T[];
	total_pages: number;
	total_results: number;
}

interface RawGenreList {
	genres: { id: number; name: string }[];
}

interface RawMovieDetails extends Omit<RawMovie, 'genre_ids'> {
	runtime: number | null;
	genres: { id: number; name: string }[];
	origin_country?: string[];
	production_countries?: { iso_3166_1: string }[];
	credits?: {
		crew: RawCrewMember[];
		cast?: RawCastMember[];
	};
}

interface RawCrewMember {
	id?: number;
	job: string;
	name: string;
	department?: string;
	profile_path?: string | null;
}

interface RawCastMember {
	id: number;
	name: string;
	character: string;
	profile_path: string | null;
	order: number;
}

interface RawVideo {
	key: string;
	name: string;
	site: string;
	type: string;
	official: boolean;
	iso_639_1: string;
}

interface RawMovieFull extends RawMovieDetails {
	tagline: string;
	vote_count: number;
	videos?: { results: RawVideo[] };
	production_companies?: { name: string }[];
}

interface RawImage {
	file_path: string;
	iso_639_1: string | null;
	vote_average: number;
}

interface RawImages {
	backdrops: RawImage[];
	posters: RawImage[];
}

export class TMDbError extends Error {
	constructor(
		readonly status: number,
		readonly path: string
	) {
		super(`TMDb respondeu ${status} em ${path}`);
		this.name = 'TMDbError';
	}
}

// ─── Cache em memória por instância (a Vercel reaproveita instâncias) ─
const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;

	const value = load();
	cache.set(key, { expiresAt: Date.now() + ttlMs, value });
	// Falhas não ficam em cache.
	value.catch(() => cache.delete(key));
	return value;
}

async function tmdbFetch<T>(
	path: string,
	/** `language: null` remove o idioma padrão (ex.: imagens de todos os idiomas). */
	params: Record<string, string | number | null> = {},
	fetchFn: typeof fetch = fetch
): Promise<T> {
	const url = new URL(`${API_BASE}${path}`);
	url.searchParams.set('language', LANGUAGE);
	for (const [key, value] of Object.entries(params)) {
		if (value === null) url.searchParams.delete(key);
		else url.searchParams.set(key, String(value));
	}

	const response = await fetchFn(url, {
		headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`, Accept: 'application/json' }
	});

	if (!response.ok) throw new TMDbError(response.status, path);
	return response.json() as Promise<T>;
}

// ─── Normalização ────────────────────────────────────────────────────
export function toMovie(raw: RawMovie, genreNames: Map<number, string>): TMDbMovie {
	const releaseDate = raw.release_date || null;
	return {
		id: raw.id,
		title: raw.title,
		originalTitle: raw.original_title,
		overview: raw.overview,
		posterPath: raw.poster_path,
		backdropPath: raw.backdrop_path,
		releaseDate,
		year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
		voteAverage: Math.round(raw.vote_average * 10) / 10,
		genres: raw.genre_ids.flatMap((id) => genreNames.get(id) ?? [])
	};
}

/** Remove conteúdo adulto e itens sem imagem (inúteis numa vitrine visual). */
export const isShowcaseable = (raw: RawMovie) =>
	!raw.adult && !raw.softcore && Boolean(raw.poster_path);

// ─── API pública do módulo ───────────────────────────────────────────
export function getGenreNames(fetchFn?: typeof fetch) {
	return cached('genres', GENRES_TTL_MS, async () => {
		const data = await tmdbFetch<RawGenreList>('/genre/movie/list', {}, fetchFn);
		return new Map(data.genres.map((genre) => [genre.id, genre.name]));
	});
}

async function getCatalog(path: string, fetchFn?: typeof fetch) {
	return cached(`catalog:${path}`, CATALOG_TTL_MS, async () => {
		const [page, genreNames] = await Promise.all([
			tmdbFetch<RawPage<RawMovie>>(path, { region: REGION, page: 1 }, fetchFn),
			getGenreNames(fetchFn)
		]);
		return page.results.filter(isShowcaseable).map((raw) => toMovie(raw, genreNames));
	});
}

export const getPopular = (fetchFn?: typeof fetch) => getCatalog('/movie/popular', fetchFn);
export const getNowPlaying = (fetchFn?: typeof fetch) => getCatalog('/movie/now_playing', fetchFn);

/** TMDb não serve além da página 500. */
export const MAX_PAGE = 500;
const SEARCH_TTL_MS = 10 * 60 * 1000;

export interface MoviePage {
	results: TMDbMovie[];
	page: number;
	totalPages: number;
}

/**
 * Uma página de resultados: busca por texto (`/search/movie`) ou, sem termo, os filmes em alta.
 * Usada pela rolagem infinita da busca (earlySetup.md §4.2.1).
 */
export function getMoviePage(query: string, page: number, fetchFn?: typeof fetch) {
	const term = query.trim();
	const safePage = Math.min(Math.max(1, Math.floor(page) || 1), MAX_PAGE);
	const [path, params] = term
		? ['/search/movie', { query: term, include_adult: 'false', page: safePage }]
		: ['/movie/popular', { region: REGION, page: safePage }];

	return cached(`page:${path}:${term.toLowerCase()}:${safePage}`, SEARCH_TTL_MS, async () => {
		const [raw, genreNames] = await Promise.all([
			tmdbFetch<RawPage<RawMovie>>(path, params, fetchFn),
			getGenreNames(fetchFn)
		]);
		return {
			results: raw.results.filter(isShowcaseable).map((movie) => toMovie(movie, genreNames)),
			page: raw.page,
			totalPages: Math.min(raw.total_pages, MAX_PAGE)
		} satisfies MoviePage;
	});
}

/** Detalhes de um filme, com direção e país de origem (usado para popular o cache local `Movie`). */
export function getMovieDetails(id: number, fetchFn?: typeof fetch): Promise<TMDbMovieDetails> {
	return cached(`movie:${id}`, CATALOG_TTL_MS, async () => {
		const raw = await tmdbFetch<RawMovieDetails>(
			`/movie/${id}`,
			{ append_to_response: 'credits' },
			fetchFn
		);
		return toMovieDetails(raw);
	});
}

export function toMovieDetails(raw: RawMovieDetails): TMDbMovieDetails {
	const genreNames = new Map(raw.genres.map((genre) => [genre.id, genre.name]));
	const countries = raw.origin_country?.length
		? raw.origin_country
		: (raw.production_countries ?? []).map((country) => country.iso_3166_1);

	return {
		...toMovie({ ...raw, genre_ids: raw.genres.map((genre) => genre.id) }, genreNames),
		runtime: raw.runtime || null,
		directors: (raw.credits?.crew ?? [])
			.filter((member) => member.job === 'Director')
			.map((member) => member.name),
		countries
	};
}

// ─── Detalhes completos (página /movie/[id]) ─────────────────────────
const unique = (items: string[]) => [...new Set(items)];

/** Trailer do YouTube: tipo Trailer > Teaser; pt > en > outros; oficial primeiro. */
export function pickTrailer(videos: RawVideo[]): Trailer | null {
	const score = (video: RawVideo) =>
		(video.type === 'Trailer' ? 100 : 0) +
		(video.iso_639_1 === 'pt' ? 20 : video.iso_639_1 === 'en' ? 10 : 0) +
		(video.official ? 5 : 0);

	const best = videos
		.filter((video) => video.site === 'YouTube' && ['Trailer', 'Teaser'].includes(video.type))
		.sort((a, b) => score(b) - score(a))[0];
	return best ? { key: best.key, name: best.name } : null;
}

/** Pessoas da equipe com foto, sem repetir (a mesma pessoa pode ter vários créditos). */
function crewPeople(crew: RawCrewMember[], jobs: Record<string, string>, limit: number) {
	const people = new Map<number, CrewMember>();
	for (const member of crew) {
		const role = jobs[member.job];
		if (!role || member.id === undefined) continue;
		const known = people.get(member.id);
		if (known) {
			if (!known.job.includes(role)) known.job += `, ${role}`;
		} else {
			people.set(member.id, {
				id: member.id,
				name: member.name,
				job: role,
				profilePath: member.profile_path ?? null
			});
		}
	}
	return [...people.values()].slice(0, limit);
}

const WRITING_JOBS: Record<string, string> = {
	Screenplay: 'Roteiro',
	Writer: 'Roteiro',
	Story: 'História',
	Novel: 'Livro',
	Characters: 'Personagens'
};

export function toMovieFull(raw: RawMovieFull): TMDbMovieFull {
	const crew = raw.credits?.crew ?? [];
	return {
		...toMovieDetails(raw),
		tagline: raw.tagline || null,
		voteCount: raw.vote_count,
		directing: crewPeople(crew, { Director: 'Direção' }, 4),
		writing: crewPeople(crew, WRITING_JOBS, 6),
		composers: unique(
			crew.filter((member) => member.job === 'Original Music Composer').map((member) => member.name)
		),
		studios: (raw.production_companies ?? []).slice(0, 3).map((company) => company.name),
		cast: [...(raw.credits?.cast ?? [])]
			.sort((a, b) => a.order - b.order)
			.slice(0, 24)
			.map((member) => ({
				id: member.id,
				name: member.name,
				character: member.character,
				profilePath: member.profile_path
			})),
		trailer: pickTrailer(raw.videos?.results ?? [])
	};
}

export function getMovieFull(id: number, fetchFn?: typeof fetch): Promise<TMDbMovieFull> {
	return cached(`movie-full:${id}`, CATALOG_TTL_MS, async () =>
		toMovieFull(
			await tmdbFetch<RawMovieFull>(
				`/movie/${id}`,
				{
					append_to_response: 'credits,videos',
					include_video_language: 'pt,en,null'
				},
				fetchFn
			)
		)
	);
}

const MAX_IMAGES = 60;

/** Melhores primeiro (votos do TMDb); `language` nulo = imagem sem texto. */
const toImages = (images: RawImage[]): MovieImage[] =>
	[...images]
		.sort((a, b) => b.vote_average - a.vote_average)
		.slice(0, MAX_IMAGES)
		.map((image) => ({ path: image.file_path, language: image.iso_639_1 }));

/** Pôsteres e fundos em todos os idiomas — para a galeria e a personalização do filme. */
export function getMovieImages(id: number, fetchFn?: typeof fetch): Promise<MovieImages> {
	return cached(`movie-images:${id}`, CATALOG_TTL_MS, async () => {
		const raw = await tmdbFetch<RawImages>(`/movie/${id}/images`, { language: null }, fetchFn);
		return { backdrops: toImages(raw.backdrops), posters: toImages(raw.posters) };
	});
}
