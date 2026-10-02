import { error } from '@sveltejs/kit';
import { getDiary } from '$lib/server/diary';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	return { entries: await getDiary(locals.user.id, locals.locale) };
};
