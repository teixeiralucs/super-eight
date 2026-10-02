import { redirect } from '@sveltejs/kit';
import { safeRedirectPath } from '$lib/server/auth';
import { syncPreferencesOnLogin } from '$lib/server/preferences';
import type { RequestHandler } from './$types';

// Exceção permitida à regra de Form Actions (earlySetup.md §5.1.4):
// o Supabase redireciona o navegador para cá após o OAuth / confirmação de e-mail.
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const code = url.searchParams.get('code');
	const next = safeRedirectPath(url.searchParams.get('next'));

	if (code) {
		const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			await syncPreferencesOnLogin(cookies, data.user.id, {
				locale: locals.locale,
				region: locals.region
			});
			redirect(303, next);
		}
	}

	redirect(303, '/login?error=callback');
};
