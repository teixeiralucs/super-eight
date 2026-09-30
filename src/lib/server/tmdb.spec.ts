import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ TMDB_READ_ACCESS_TOKEN: 'test-token' }));

const { isShowcaseable, toMovie, toMovieDetails } = await import('./tmdb');

const raw = {
	id: 1,
	title: 'A Odisseia',
	original_title: 'The Odyssey',
	overview: 'Sinopse',
	poster_path: '/poster.jpg',
	backdrop_path: '/backdrop.jpg',
	release_date: '2026-07-16',
	vote_average: 8.0172,
	genre_ids: [28, 12, 999],
	adult: false
};

describe('toMovie', () => {
	it('normaliza campos e resolve nomes de gênero', () => {
		const genres = new Map([
			[28, 'Ação'],
			[12, 'Aventura']
		]);

		expect(toMovie(raw, genres)).toEqual({
			id: 1,
			title: 'A Odisseia',
			originalTitle: 'The Odyssey',
			overview: 'Sinopse',
			posterPath: '/poster.jpg',
			backdropPath: '/backdrop.jpg',
			releaseDate: '2026-07-16',
			year: 2026,
			voteAverage: 8,
			genres: ['Ação', 'Aventura']
		});
	});

	it('trata data de lançamento vazia', () => {
		const movie = toMovie({ ...raw, release_date: '' }, new Map());
		expect(movie.releaseDate).toBeNull();
		expect(movie.year).toBeNull();
	});
});

describe('isShowcaseable', () => {
	it('exclui conteúdo adulto e filmes sem pôster', () => {
		expect(isShowcaseable(raw)).toBe(true);
		expect(isShowcaseable({ ...raw, adult: true })).toBe(false);
		expect(isShowcaseable({ ...raw, softcore: true })).toBe(false);
		expect(isShowcaseable({ ...raw, poster_path: null })).toBe(false);
	});
});

describe('toMovieDetails', () => {
	const details = {
		...raw,
		runtime: 166,
		genres: [{ id: 18, name: 'Drama' }],
		origin_country: ['US'],
		production_countries: [{ iso_3166_1: 'GB' }],
		credits: {
			crew: [
				{ job: 'Director', name: 'Christopher Nolan' },
				{ job: 'Producer', name: 'Emma Thomas' }
			]
		}
	};

	it('extrai direção, país de origem e duração', () => {
		const movie = toMovieDetails(details);
		expect(movie.directors).toEqual(['Christopher Nolan']);
		expect(movie.countries).toEqual(['US']);
		expect(movie.runtime).toBe(166);
		expect(movie.genres).toEqual(['Drama']);
	});

	it('usa países de produção quando não há país de origem', () => {
		expect(toMovieDetails({ ...details, origin_country: [] }).countries).toEqual(['GB']);
	});

	it('trata duração zero e créditos ausentes', () => {
		const movie = toMovieDetails({ ...details, runtime: 0, credits: undefined });
		expect(movie.runtime).toBeNull();
		expect(movie.directors).toEqual([]);
	});
});
