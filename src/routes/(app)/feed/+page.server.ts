import { error } from '@sveltejs/kit';
import { getFeed } from '$lib/server/social';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	return { items: await getFeed(locals.user.id, locals.locale) };
};
