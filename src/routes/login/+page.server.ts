import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { loginSchema } from '$lib/schemas/auth';
import { safeRedirectPath } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	callbackError: url.searchParams.get('error') === 'callback'
});

export const actions: Actions = {
	login: async ({ request, url, locals }) => {
		const formData = Object.fromEntries(await request.formData());
		const parsed = loginSchema.safeParse(formData);

		if (!parsed.success) {
			return fail(400, {
				email: String(formData.email ?? ''),
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}

		const { error } = await locals.supabase.auth.signInWithPassword(parsed.data);

		if (error) {
			return fail(400, {
				email: parsed.data.email,
				message: 'E-mail ou senha incorretos.'
			});
		}

		redirect(303, safeRedirectPath(url.searchParams.get('next')));
	},

	google: async ({ url, locals }) => {
		const next = safeRedirectPath(url.searchParams.get('next'));
		const redirectTo = new URL('/auth/callback', url.origin);
		redirectTo.searchParams.set('next', next);

		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: redirectTo.toString() }
		});

		if (error || !data.url) {
			return fail(500, { message: 'Não foi possível conectar com o Google.' });
		}

		redirect(303, data.url);
	}
};
