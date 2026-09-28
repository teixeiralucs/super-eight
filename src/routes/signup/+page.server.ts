import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { signupSchema, type SignupInput } from '$lib/schemas/auth';
import { prisma } from '$lib/server/db';
import type { Actions } from './$types';

type FieldErrors = Partial<Record<keyof SignupInput, string[]>>;

export const actions: Actions = {
	default: async ({ request, url, locals }) => {
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
			const errors: FieldErrors = { username: ['Esse username já está em uso.'] };
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
			return fail(400, { ...values, message: 'Não foi possível criar a conta. Tente novamente.' });
		}

		// Com "Confirm email" desligado o Supabase já devolve a sessão.
		if (data.session) redirect(303, '/dashboard');

		return { ...values, confirmEmail: true };
	}
};
