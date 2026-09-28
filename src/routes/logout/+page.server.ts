import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Logout só por POST (form action), para não ser disparado por links/prefetch.
export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		redirect(303, '/');
	}
};
