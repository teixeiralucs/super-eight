import { error } from '@sveltejs/kit';
import { getNotifications } from '$lib/server/notifications';
import type { PageServerLoad } from './$types';

// Avisos (earlySetup.md §6.13): abrir a página marca todos como lidos.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	return { items: await getNotifications(locals.user.id, locals.locale) };
};
