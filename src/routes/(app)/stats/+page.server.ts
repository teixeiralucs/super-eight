import { error } from '@sveltejs/kit';
import { getInsights } from '$lib/server/insights';
import type { PageServerLoad } from './$types';

// Estatísticas do ano (ou de sempre) a partir do diário (earlySetup.md §6.11).
export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	if (!locals.user) error(401);
	return getInsights(locals.user.id, url.searchParams.get('year'), locals.locale, fetch);
};
