import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { resetPasswordSchema } from '$lib/schemas/auth';
import { m } from '$lib/paraglide/messages';
import type { Actions } from './$types';

// Rota protegida (hooks.server.ts): chega-se aqui logado — pelo link de recuperação (o
// callback já abriu a sessão) ou por "Alterar senha" nas configurações.
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = Object.fromEntries(await request.formData());
		const parsed = resetPasswordSchema.safeParse(formData);

		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors });
		}

		const { error } = await locals.supabase.auth.updateUser({ password: parsed.data.password });

		if (error) {
			console.error('[reset-password]', error.code, error.status, error.message);
			const message =
				error.code === 'same_password'
					? m.error_password_same()
					: error.code === 'weak_password'
						? m.error_password_short()
						: m.reset_error();
			return fail(400, { message });
		}

		redirect(303, '/dashboard');
	}
};
