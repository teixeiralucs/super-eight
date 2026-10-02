import { redirect } from '@sveltejs/kit';
import { DEV_LOGIN_COOKIE } from '$lib/server/dev-login';
import type { Actions, PageServerLoad } from './$types';

// Logout só por POST (form action), para não ser disparado por links/prefetch.
export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		await locals.supabase.auth.signOut();
		cookies.delete(DEV_LOGIN_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
