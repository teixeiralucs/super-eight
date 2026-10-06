import { describe, expect, it } from 'vitest';
import { filtersQuery, foldText, hasActiveFilters, parseLibraryFilters } from './filters';

const parse = (query: string) => parseLibraryFilters(new URLSearchParams(query));

describe('parseLibraryFilters', () => {
	it('usa lançamento crescente como padrão', () => {
		expect(parse('')).toMatchObject({ view: 'all', sort: 'release', dir: 'asc' });
		expect(hasActiveFilters(parse(''))).toBe(false);
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

	it('gênero é o ID do TMDb (o nome muda com o idioma)', () => {
		expect(filtersQuery(parse('genre=878'))).toBe('?genre=878');
		expect(parse('genre=Ficção').genre).toBeUndefined();
	});
});

describe('filtros avançados', () => {
	it('valida cada filtro e descarta o inválido', () => {
		const filters = parse(
			'q=%20%20Amélie%20&decade=1980&country=FR&lang=fr&rating=8&year=2025&genre=18'
		);
		expect(filters).toMatchObject({
			q: 'Amélie',
			decade: '1980',
			country: 'FR',
			lang: 'fr',
			rating: '8',
			year: '2025',
			genre: '18'
		});
		expect(hasActiveFilters(filters)).toBe(true);
		expect(parse('decade=1985&country=fr&rating=11&year=25&q=%20')).toMatchObject({
			decade: undefined,
			country: undefined,
			rating: undefined,
			year: undefined,
			q: undefined
		});
	});

	it('mantém todos na URL, em ordem estável', () => {
		expect(filtersQuery(parse('sort=title&rating=none&q=alien&view=watched&decade=1970'))).toBe(
			'?view=watched&q=alien&decade=1970&rating=none&sort=title'
		);
	});

	it('busca ignora acento e caixa', () => {
		expect(foldText('Amélie Poulain')).toBe('amelie poulain');
		expect(foldText('SÃO PAULO')).toBe('sao paulo');
	});
});
