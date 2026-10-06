import { error } from '@sveltejs/kit';
import { isFacet, isFacetValue, PERSON_ROLES, type PersonRole } from '$lib/library/facets';
import { parseLibraryFilters } from '$lib/library/filters';
import { getFacetPage, getReleaseDay } from '$lib/server/facets';
import { m } from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

// Biblioteca filtrada a partir dos detalhes do filme (earlySetup.md §6.10).
export const load: PageServerLoad = async ({ params, url, locals, fetch }) => {
	if (!locals.user) error(401);
	const { facet, value } = params;
	if (!isFacet(facet) || !isFacetValue(facet, value)) error(404, m.error_facet_not_found());

	// Dia de lançamento: por ano, como o diário.
	if (facet === 'release') {
		return {
			facet,
			value,
			years: await getReleaseDay(locals.user.id, value, locals.locale),
			page: null,
			filters: null,
			role: 'all' as PersonRole
		};
	}

	const filters = parseLibraryFilters(url.searchParams);
	const roleParam = url.searchParams.get('role');
	const role: PersonRole =
		facet === 'person' && (PERSON_ROLES as readonly string[]).includes(roleParam ?? '')
			? (roleParam as PersonRole)
			: 'all';
	const page = await getFacetPage(
		locals.user.id,
		facet,
		value,
		filters,
		role,
		locals.locale,
		fetch
	);
	if (!page) error(404, m.error_facet_not_found());
	return { facet, value, years: null, page, filters, role };
};
