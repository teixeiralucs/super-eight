import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { LibraryRuleError } from '$lib/server/errors';
import { follow, getProfile, unfollow } from '$lib/server/social';
import type { Actions, PageServerLoad } from './$types';

// Perfil público (earlySetup.md §6.1.9, §6.6). Aberto a visitantes; privado mostra o mínimo.
export const load: PageServerLoad = async ({ params, locals }) => {
	const profile = await getProfile(params.username, locals.user?.id ?? null, locals.locale);
	if (!profile) error(404, m.error_user_not_found());
	return { profile, signedIn: Boolean(locals.user) };
};

function action(run: (userId: string, username: string) => Promise<void>) {
	return async ({ locals, params }: RequestEvent) => {
		if (!locals.user) return fail(401, { message: m.error_sign_in_to_save() });
		try {
			await run(locals.user.id, params.username ?? '');
		} catch (err) {
			if (err instanceof LibraryRuleError) return fail(400, { message: err.message });
			throw err;
		}
		return { ok: true };
	};
}

export const actions: Actions = {
	follow: action(follow),
	unfollow: action(unfollow)
};
