// Normalização das respostas do TMDb — funções puras, sem `$env`, para poderem rodar
// também nos scripts de linha de comando (ver scripts/movies-backfill-i18n.ts).
import type {
	CollectionData,
	CrewMember,
	Localized,
	MovieCacheData,
	MovieImage,
	TMDbMovie,
	TMDbMovieFull,
	Trailer
} from '$lib/tmdb/types';

// ─── Formatos crus do TMDb (apenas os campos que lemos) ──────────────
export interface RawMovie {
	id: number;
	title: string;
	original_title: string;
	original_language?: string;
	overview: string;
	poster_path: string | null;
	backdrop_path: string | null;
	release_date: string;
	vote_average: number;
	genre_ids: number[];
	adult: boolean;
	softcore?: boolean;
}

export interface RawPage<T> {
	page: number;
	results: T[];
	total_pages: number;
	total_results: number;
}

export interface RawGenreList {
	genres: { id: number; name: string }[];
}

export interface RawMovieDetails extends Omit<RawMovie, 'genre_ids'> {
	runtime: number | null;
	genres: { id: number; name: string }[];
	origin_country?: string[];
	production_countries?: { iso_3166_1: string }[];
	/** Saga do TMDb (ex.: "Star Wars Collection"), no idioma pedido. */
	belongs_to_collection?: { id: number; name: string } | null;
	credits?: {
		crew: RawCrewMember[];
		cast?: RawCastMember[];
	};
}

export interface RawCrewMember {
	id?: number;
	job: string;
	name: string;
	department?: string;
	profile_path?: string | null;
}

export interface RawCastMember {
	id: number;
	name: string;
	character: string;
	profile_path: string | null;
	order: number;
}

export interface RawVideo {
	key: string;
	name: string;
	site: string;
	type: string;
	official: boolean;
	iso_639_1: string;
}

export interface RawTranslation {
	iso_639_1: string;
	iso_3166_1: string;
	data: { title?: string; overview?: string; tagline?: string };
}

export interface RawReleaseDates {
	results: {
		iso_3166_1: string;
		release_dates: { release_date: string; type: number }[];
	}[];
}

export interface RawImage {
	file_path: string;
	iso_639_1: string | null;
	vote_average: number;
}

export interface RawImages {
	backdrops: RawImage[];
	posters: RawImage[];
	logos?: RawImage[];
}

/** Detalhes "neutros" para o cache local: traduções e pôsteres de todos os idiomas. */
export interface RawMovieForCache extends RawMovieDetails {
	translations?: { translations: RawTranslation[] };
	images?: RawImages;
}

export interface RawMovieFull extends RawMovieDetails {
	tagline: string;
	vote_count: number;
	videos?: { results: RawVideo[] };
	production_companies?: { name: string }[];
	release_dates?: RawReleaseDates;
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

const directorsOf = (raw: RawMovieDetails) =>
	(raw.credits?.crew ?? []).filter((member) => member.job === 'Director').map((m) => m.name);

const countriesOf = (raw: RawMovieDetails) =>
	raw.origin_country?.length
		? raw.origin_country
		: (raw.production_countries ?? []).map((country) => country.iso_3166_1);

/** Título traduzido: país preferido > mesmo idioma em outro país > nulo (a UI usa o original). */
export function pickTranslation(
	translations: RawTranslation[],
	language: string,
	countries: string[],
	field: 'title' | 'overview' = 'title'
) {
	const candidates = translations.filter((t) => t.iso_639_1 === language && t.data[field]?.trim());
	for (const country of countries) {
		const match = candidates.find((t) => t.iso_3166_1 === country);
		if (match) return match.data[field]!.trim();
	}
	return candidates[0]?.data[field]?.trim() || null;
}

/** Pôster mais votado no idioma; sem pôster no idioma, `fallback`. */
const bestPoster = (posters: RawImage[], language: string, fallback: string | null) =>
	posters
		.filter((image) => image.iso_639_1 === language)
		.sort((a, b) => b.vote_average - a.vote_average)[0]?.file_path ?? fallback;

/**
 * Dados do filme para o cache local `Movie` (earlySetup.md §3.3): título original,
 * traduções pt-BR/en-US/es-MX e pôster de cada idioma. `raw` vem em inglês (en-US).
 */
export function toMovieCache(raw: RawMovieForCache): MovieCacheData {
	const translations = raw.translations?.translations ?? [];
	const posters = raw.images?.posters ?? [];
	const releaseDate = raw.release_date || null;
	const original = raw.original_title || raw.title;
	// A tradução igual ao original não acrescenta nada: guarda nulo.
	const distinct = (title: string | null) => (title && title !== original ? title : null);

	return {
		id: raw.id,
		originalTitle: original,
		originalLanguage: raw.original_language ?? null,
		titles: {
			pt: distinct(pickTranslation(translations, 'pt', ['BR', 'PT'])),
			en: distinct(pickTranslation(translations, 'en', ['US', 'GB']) ?? raw.title),
			es: distinct(pickTranslation(translations, 'es', ['MX', 'AR', 'CO', 'CL', 'ES']))
		},
		posters: {
			pt: bestPoster(posters, 'pt', raw.poster_path),
			en: bestPoster(posters, 'en', raw.poster_path),
			es: bestPoster(posters, 'es', raw.poster_path)
		},
		backdropPath: raw.backdrop_path,
		releaseDate,
		year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
		runtime: raw.runtime || null,
		genreIds: raw.genres.map((genre) => genre.id),
		directors: directorsOf(raw),
		countries: countriesOf(raw),
		voteAverage: Math.round(raw.vote_average * 10) / 10,
		collectionId: raw.belongs_to_collection?.id ?? null
	};
}

// ─── Coleções (sagas) ────────────────────────────────────────────────
export interface RawCollection {
	id: number;
	name: string;
	poster_path: string | null;
	backdrop_path: string | null;
	parts: { id: number; release_date?: string }[];
}

/** Coleção nos três idiomas → cache `Collection`. Partes por lançamento (sem data no fim). */
export function toCollection(raw: Localized<RawCollection>): CollectionData {
	const release = (part: { release_date?: string }) => part.release_date || '9999';
	const parts = [...raw.en.parts].sort((a, b) => release(a).localeCompare(release(b)));
	// Nome igual ao inglês não acrescenta nada (o TMDb repete o inglês sem tradução).
	const translated = (name: string) => (name && name !== raw.en.name ? name : null);
	return {
		id: raw.en.id,
		names: { pt: translated(raw.pt.name), en: raw.en.name, es: translated(raw.es.name) },
		posterPath: raw.pt.poster_path ?? raw.en.poster_path,
		backdropPath: raw.en.backdrop_path,
		partIds: parts.map((part) => part.id)
	};
}

// ─── Detalhes completos (página /movie/[id]) ─────────────────────────
const unique = (items: string[]) => [...new Set(items)];

/** Trailer do YouTube: tipo Trailer > Teaser; idioma de quem vê > inglês > outros; oficial primeiro. */
export function pickTrailer(videos: RawVideo[], language = 'pt'): Trailer | null {
	const score = (video: RawVideo) =>
		(video.type === 'Trailer' ? 100 : 0) +
		(video.iso_639_1 === language ? 20 : video.iso_639_1 === 'en' ? 10 : 0) +
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

/** Funções da equipe exibidas, já com o rótulo no idioma de quem vê. */
export interface CrewLabels {
	directing: string;
	writing: string;
	story: string;
	novel: string;
	characters: string;
}

/**
 * Estreia na região (cinema > digital > qualquer); `null` se o TMDb não tiver data para o país.
 * Tipos do TMDb: 2 limitado, 3 cinema, 4 digital, 5 físico, 6 TV.
 */
export function regionalRelease(raw: RawReleaseDates | undefined, region: string) {
	const dates = raw?.results.find((r) => r.iso_3166_1 === region)?.release_dates ?? [];
	const rank = (type: number) => (type === 3 ? 0 : type === 2 ? 1 : type === 4 ? 2 : 3);
	const best = [...dates].sort(
		(a, b) => rank(a.type) - rank(b.type) || a.release_date.localeCompare(b.release_date)
	)[0];
	return best ? best.release_date.slice(0, 10) : null;
}

/**
 * Logo padrão do título. O título original é o destaque da página, então vale a logo no
 * idioma original; depois a de quem vê, a em inglês e a mais votada. `logos` já vem
 * ordenada por votos.
 */
export function pickLogo(
	logos: MovieImage[],
	originalLanguage: string | null,
	viewerLanguage: string
): string | null {
	for (const language of [originalLanguage, viewerLanguage, 'en']) {
		const match = logos.find((logo) => language && logo.language === language);
		if (match) return match.path;
	}
	return logos[0]?.path ?? null;
}

/** Logo padrão para cada idioma do app, para o cache `Movie` (cards). */
export const localizedLogos = (
	logos: MovieImage[],
	originalLanguage: string | null
): Localized<string | null> => ({
	pt: pickLogo(logos, originalLanguage, 'pt'),
	en: pickLogo(logos, originalLanguage, 'en'),
	es: pickLogo(logos, originalLanguage, 'es')
});

/** Imagens cruas → as mais votadas primeiro; `language` nulo = sem texto. */
export const toImages = (images: RawImage[]): MovieImage[] =>
	[...images]
		.sort((a, b) => b.vote_average - a.vote_average)
		.map((image) => ({ path: image.file_path, language: image.iso_639_1 }));

/**
 * `trailerLanguage`: ISO 639-1 de quem vê (trailer e logo preferidos).
 * `logos`: logos do filme (ver `getMovieImages`); vazio = título em texto.
 */
export function toMovieFull(
	raw: RawMovieFull,
	trailerLanguage: string,
	region: string,
	labels: CrewLabels,
	logos: MovieImage[] = []
): TMDbMovieFull {
	const crew = raw.credits?.crew ?? [];
	const genreNames = new Map(raw.genres.map((genre) => [genre.id, genre.name]));
	return {
		...toMovie({ ...raw, genre_ids: raw.genres.map((genre) => genre.id) }, genreNames),
		originalLanguage: raw.original_language ?? null,
		runtime: raw.runtime || null,
		directors: directorsOf(raw),
		countries: countriesOf(raw),
		tagline: raw.tagline || null,
		voteCount: raw.vote_count,
		regionalRelease: regionalRelease(raw.release_dates, region),
		directing: crewPeople(crew, { Director: labels.directing }, 4),
		writing: crewPeople(
			crew,
			{
				Screenplay: labels.writing,
				Writer: labels.writing,
				Story: labels.story,
				Novel: labels.novel,
				Characters: labels.characters
			},
			6
		),
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
		trailer: pickTrailer(raw.videos?.results ?? [], trailerLanguage),
		logoPath: pickLogo(logos, raw.original_language ?? null, trailerLanguage),
		collection: raw.belongs_to_collection
			? { id: raw.belongs_to_collection.id, name: raw.belongs_to_collection.name }
			: null
	};
}
