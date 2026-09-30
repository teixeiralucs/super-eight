import { describe, expect, it } from 'vitest';
import { filtersQuery, parseLibraryFilters } from './filters';

const parse = (query: string) => parseLibraryFilters(new URLSearchParams(query));

describe('parseLibraryFilters', () => {
	it('usa lançamento crescente como padrão', () => {
		expect(parse('')).toEqual({ view: 'all', sort: 'release', dir: 'asc', genre: undefined });
	});

	it('aplica a direção natural de cada ordenação', () => {
		expect(parse('sort=rating').dir).toBe('desc');
		expect(parse('sort=title').dir).toBe('asc');
		expect(parse('sort=rating&dir=asc').dir).toBe('asc');
	});

	it('ignora valores inválidos em vez de quebrar', () => {
		expect(parse('view=xyz&sort=abc&dir=up')).toMatchObject({
			view: 'all',
			sort: 'release',
			dir: 'asc'
		});
	});
});

describe('filtersQuery', () => {
	it('omite valores padrão', () => {
		expect(filtersQuery(parse(''))).toBe('');
		expect(filtersQuery(parse('sort=rating'))).toBe('?sort=rating');
	});

	it('inclui direção só quando difere da natural e nunca no aleatório', () => {
		expect(filtersQuery(parse('sort=release&dir=desc'))).toBe('?dir=desc');
		expect(filtersQuery(parse('sort=random&dir=desc'))).toBe('?sort=random');
	});

	it('codifica gênero', () => {
		expect(filtersQuery(parse('genre=Ficção científica'))).toBe(
			'?genre=Fic%C3%A7%C3%A3o%20cient%C3%ADfica'
		);
	});
});
