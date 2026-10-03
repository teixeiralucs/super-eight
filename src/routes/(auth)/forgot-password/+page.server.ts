import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { forgotPasswordSchema } from '$lib/schemas/auth';
import { m } from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	expired: url.searchParams.has('expired')
});

export const actions: Actions = {
	default: async ({ request, url, locals }) => {
		const formData = Object.fromEntries(await request.formData());
		const parsed = forgotPasswordSchema.safeParse(formData);

		if (!parsed.success) {
			return fail(400, {
				email: String(formData.email ?? ''),
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}

		const { email } = parsed.data;
		// O link do e-mail passa pelo callback (troca o código por sessão) e cai na tela de
		// nova senha. Precisa estar nas Redirect URLs do Supabase — o mesmo callback do Google.
		const redirectTo = new URL('/auth/callback', url.origin);
		redirectTo.searchParams.set('next', '/reset-password');

		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: redirectTo.toString()
		});

		if (error) {
			console.error('[forgot-password]', error.code, error.status, error.message);
			// "E-mail não cadastrado" não chega aqui (o Supabase não revela); só limites e falhas.
			const message =
				error.status === 429 || error.code === 'over_email_send_rate_limit'
					? m.forgot_rate_limited()
					: m.forgot_error();
			return fail(error.status === 429 ? 429 : 500, { email, message });
		}

		// Mesma resposta exista ou não a conta: não revela quem está cadastrado.
		return { email, sent: true };
	}
};
