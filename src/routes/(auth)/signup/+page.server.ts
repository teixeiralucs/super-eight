import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { signupSchema, type SignupInput } from '$lib/schemas/auth';
import { prisma } from '$lib/server/db';
import { syncPreferencesOnLogin } from '$lib/server/preferences';
import { m } from '$lib/paraglide/messages';
import type { Actions } from './$types';

type FieldErrors = Partial<Record<keyof SignupInput, string[]>>;

/** Códigos de erro do Supabase Auth → mensagens para o usuário (no idioma da requisição). */
const SIGNUP_ERRORS: Record<string, () => string> = {
	user_already_exists: m.error_account_exists,
	email_exists: m.error_account_exists,
	weak_password: m.error_weak_password,
	email_address_invalid: m.error_email_not_accepted,
	over_email_send_rate_limit: m.error_rate_limit,
	signup_disabled: m.error_signup_disabled,
	email_provider_disabled: m.error_email_signup_disabled
};

export const actions: Actions = {
	default: async ({ request, url, locals, cookies }) => {
		const formData = Object.fromEntries(await request.formData());
		const parsed = signupSchema.safeParse(formData);
		const values = {
			email: String(formData.email ?? ''),
			username: String(formData.username ?? '')
		};

		if (!parsed.success) {
			const errors: FieldErrors = z.flattenError(parsed.error).fieldErrors;
			return fail(400, { ...values, errors });
		}

		const { email, password, username } = parsed.data;

		// Checagem amigável; a constraint UNIQUE no banco continua sendo a garantia final.
		const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
		if (taken) {
			const errors: FieldErrors = { username: [m.error_username_taken()] };
			return fail(400, { ...values, errors });
		}

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				// Lido pelo trigger handle_new_auth_user para preencher public."User".username.
				data: { username },
				emailRedirectTo: new URL('/auth/callback', url.origin).toString()
			}
		});

		if (error) {
			console.error('[signup] Supabase signUp falhou:', error.code, error.status, error.message);
			const message = (error.code && SIGNUP_ERRORS[error.code]?.()) || m.error_signup_generic();
			return fail(400, { ...values, message });
		}

		// Com "Confirm email" desligado o Supabase já devolve a sessão.
		// O perfil nasce com o idioma e a região que a pessoa já está usando.
		if (data.user) {
			await syncPreferencesOnLogin(cookies, data.user.id, {
				locale: locals.locale,
				region: locals.region
			}).catch((err) => console.error('[signup] preferências:', err));
		}
		if (data.session) redirect(303, '/dashboard');

		return { ...values, confirmEmail: true };
	}
};
