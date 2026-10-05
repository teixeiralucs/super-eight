import { error } from '@sveltejs/kit';
import { getFeed, suggestPeople } from '$lib/server/social';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	const [items, suggestions] = await Promise.all([
		getFeed(locals.user.id, locals.locale),
		suggestPeople(locals.user.id)
	]);
	return { items, suggestions };
};
