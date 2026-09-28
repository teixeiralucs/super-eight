import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ TMDB_READ_ACCESS_TOKEN: 'test-token' }));

const { isShowcaseable, toMovie } = await import('./tmdb');

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
