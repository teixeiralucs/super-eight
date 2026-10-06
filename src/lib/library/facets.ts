import { m } from '$lib/paraglide/messages';

/**
 * Filtros da biblioteca a partir dos detalhes do filme (earlySetup.md §6.10): clicar numa
 * pessoa, país, idioma, gênero, estúdio ou data de lançamento mostra os filmes da sua
 * biblioteca com aquilo. URL: /library/[facet]/[valor].
 */
export const FACETS = ['person', 'country', 'language', 'genre', 'studio', 'release'] as const;
export type Facet = (typeof FACETS)[number];

/** Funções de uma pessoa (a página dela soma todas e permite filtrar). */
export const PERSON_ROLES = ['all', 'director', 'writer', 'cast', 'composer'] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

export const roleLabel = (role: PersonRole) =>
	({
		all: m.facet_role_all,
		director: m.crew_directing,
		writer: m.crew_writing,
		cast: m.crew_cast,
		composer: m.fact_music
	})[role]();

const VALID: Record<Facet, RegExp> = {
	person: /^\d{1,9}$/,
	genre: /^\d{1,6}$/,
	studio: /^\d{1,9}$/,
	country: /^[A-Z]{2}$/,
	language: /^[a-z]{2,3}$/,
	// Dia e mês ("12-25"), sem ano: os lançamentos daquele dia em todos os anos.
	release: /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
};

export const isFacet = (value: string): value is Facet =>
	(FACETS as readonly string[]).includes(value);
export const isFacetValue = (facet: Facet, value: string) => VALID[facet].test(value);

/** Caminho da página filtrada (para `resolve`: rota `/(app)/library/[facet]/[value]`). */
export const facetParams = (facet: Facet, value: string | number) => ({
	facet,
	value: String(value)
});

/** "2001-07-20" → "07-20". */
export const releaseKey = (isoDate: string) => isoDate.slice(5, 10);
