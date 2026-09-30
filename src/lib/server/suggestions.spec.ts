import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ TMDB_READ_ACCESS_TOKEN: 'test-token' }));
vi.mock('$lib/server/db', () => ({ prisma: {} }));

const { pickSuggestions, shuffle } = await import('./suggestions');

const movie = (id: number, backdrop = true) => ({
	id,
	title: `Filme ${id}`,
	originalTitle: '',
	overview: '',
	posterPath: '/p.jpg',
	backdropPath: backdrop ? '/b.jpg' : null,
	releaseDate: null,
	year: null,
	voteAverage: 7,
	genres: []
});

describe('shuffle', () => {
	it('mantém os mesmos itens sem alterar o original', () => {
		const items = [1, 2, 3, 4, 5];
		const result = shuffle(items);
		expect([...result].sort()).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('pickSuggestions', () => {
	it('remove assistidos, duplicados e filmes sem backdrop, e limita a quantidade', () => {
		const pool = [movie(1), movie(2), movie(2), movie(3, false), movie(4), movie(5), movie(6)];
		const picks = pickSuggestions(pool, new Set([1]), 3);

		expect(picks).toHaveLength(3);
		const ids = picks.map((m) => m.id);
		expect(ids).not.toContain(1);
		expect(ids).not.toContain(3);
		expect(new Set(ids).size).toBe(3);
	});
});
