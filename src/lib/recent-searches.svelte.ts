/**
 * Últimas buscas (earlySetup.md §6.14): as 3 mais recentes, sem repetir (sem diferenciar
 * maiúsculas), guardadas só neste navegador. Se o armazenamento estiver bloqueado, a lista
 * vale só enquanto a página está aberta.
 */
const KEY = 'super-eight:recent-searches';
export const MAX_RECENT = 3;

function load(): string[] {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(parsed)
			? parsed.filter((term): term is string => typeof term === 'string').slice(0, MAX_RECENT)
			: [];
	} catch {
		return [];
	}
}

function save(terms: string[]) {
	try {
		localStorage.setItem(KEY, JSON.stringify(terms));
	} catch {
		// Sem armazenamento (aba anônima, bloqueado): fica só na memória.
	}
}

export const recentSearches = $state({ terms: [] as string[], loaded: false });

/** Lê do navegador na primeira vez que a busca abre (não existe no servidor). */
export function loadRecentSearches() {
	if (recentSearches.loaded) return;
	recentSearches.terms = load();
	recentSearches.loaded = true;
}

export function addRecentSearch(term: string) {
	const clean = term.trim();
	if (!clean) return;
	loadRecentSearches();
	const lower = clean.toLocaleLowerCase();
	recentSearches.terms = [
		clean,
		...recentSearches.terms.filter((other) => other.toLocaleLowerCase() !== lower)
	].slice(0, MAX_RECENT);
	save(recentSearches.terms);
}

export function removeRecentSearch(term: string) {
	loadRecentSearches();
	recentSearches.terms = recentSearches.terms.filter((other) => other !== term);
	save(recentSearches.terms);
}
