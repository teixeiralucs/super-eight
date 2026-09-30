import { describe, expect, it } from 'vitest';
import { MAX_QUERY_LENGTH, parseSearchPage, parseSearchQuery } from './search';

const params = (query: string) => new URLSearchParams(query);

describe('parseSearchQuery', () => {
	it('apara espaços e limita o tamanho', () => {
		expect(parseSearchQuery(params('q=  batman  '))).toBe('batman');
		expect(parseSearchQuery(params(`q=${'a'.repeat(300)}`))).toHaveLength(MAX_QUERY_LENGTH);
		expect(parseSearchQuery(params(''))).toBe('');
	});
});

describe('parseSearchPage', () => {
	it('aceita só inteiros entre 1 e 500', () => {
		expect(parseSearchPage(params('page=3'))).toBe(3);
		expect(parseSearchPage(params('page=0'))).toBe(1);
		expect(parseSearchPage(params('page=501'))).toBe(1);
		expect(parseSearchPage(params('page=abc'))).toBe(1);
		expect(parseSearchPage(params('page=2.5'))).toBe(1);
	});
});
