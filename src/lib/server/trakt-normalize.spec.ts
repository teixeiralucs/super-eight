import { describe, expect, it } from 'vitest';
import { toTraktList } from './trakt-normalize';

const movie = (title: string, tmdb: number | null, released: string | null, year = 2000) => ({
	type: 'movie',
	movie: { title, year, released, ids: { trakt: tmdb ?? 0, tmdb } }
});

describe('toTraktList', () => {
	const list = toTraktList(
		{ name: ' Kurosawa ', description: 'Kurosawa', ids: { trakt: 7, slug: 'kurosawa' } },
		[
			movie('Ran', 11645, '1985-06-01'),
			movie('Rashomon', 548, '1950-08-26'),
			movie('Sem TMDb', null, '1960-01-01'),
			movie('Rashomon', 548, '1950-08-26'),
			movie('Anunciado', 999, null, 2027),
			{ type: 'show' }
		]
	);

	it('ordena por lançamento e descarta repetidos, sem TMDb e não filmes', () => {
		expect(list.partIds).toEqual([548, 11645, 999]);
		expect(list.parts[2].releaseDate).toBe('2027-12-31');
	});

	it('nome limpo; descrição igual ao nome vira nula', () => {
		expect(list.name).toBe('Kurosawa');
		expect(list.description).toBeNull();
	});
});
