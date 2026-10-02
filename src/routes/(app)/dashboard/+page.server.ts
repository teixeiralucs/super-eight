import { error, fail } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { parseLibraryFilters } from '$lib/library/filters';
import { clearLibrary, seedDemoLibrary } from '$lib/server/dev-seed';
import { getDashboardOverview, getLibraryGrid, getLibrarySuggestions } from '$lib/server/library';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	if (!locals.user) error(401);

	const filters = parseLibraryFilters(url.searchParams);
	const [overview, library, suggestions] = await Promise.all([
		getDashboardOverview(locals.user.id, locals.locale, fetch),
		getLibraryGrid(locals.user.id, filters, locals.locale),
		getLibrarySuggestions(locals.user.id, locals.locale)
	]);

	return { ...overview, library, suggestions, filters, dev };
};

export const actions: Actions = {
	// Ferramentas de desenvolvimento: inexistentes em produção.
	seedDemo: async ({ locals, fetch }) => {
		if (!dev) error(404);
		if (!locals.user) error(401);
		try {
			await seedDemoLibrary(locals.user.id, {
				locale: locals.locale,
				region: locals.region,
				fetch
			});
		} catch (err) {
			console.error('[dev] seed falhou:', err);
			return fail(500, { message: 'Não foi possível carregar os filmes de exemplo.' });
		}
	},
	clearDemo: async ({ locals }) => {
		if (!dev) error(404);
		if (!locals.user) error(401);
		await clearLibrary(locals.user.id);
	}
};
