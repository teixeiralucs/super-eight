import { describe, expect, it } from 'vitest';
import { addRecentSearch, recentSearches, removeRecentSearch } from './recent-searches.svelte';

describe('buscas recentes', () => {
	it('guarda as 3 mais recentes, sem repetir (ignorando maiúsculas)', () => {
		for (const term of ['matrix', 'kubrick', 'amélie', '  Matrix  ', 'akira'])
			addRecentSearch(term);
		expect(recentSearches.terms).toEqual(['akira', 'Matrix', 'amélie']);
		addRecentSearch('   ');
		expect(recentSearches.terms).toHaveLength(3);
	});

	it('remove uma busca', () => {
		removeRecentSearch('Matrix');
		expect(recentSearches.terms).toEqual(['akira', 'amélie']);
	});
});
