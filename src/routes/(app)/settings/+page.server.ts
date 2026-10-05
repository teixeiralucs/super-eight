import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { profileSchema } from '$lib/schemas/social';
import { m } from '$lib/paraglide/messages';
import { prisma } from '$lib/server/db';
import { removeAvatar, uploadAvatar } from '$lib/server/avatar';
import { LibraryRuleError } from '$lib/server/errors';
import { updateProfile } from '$lib/server/social';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	const user = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: {
			username: true,
			name: true,
			bio: true,
			avatarUrl: true,
			isPrivate: true,
			locale: true,
			region: true
		}
	});
	if (!user) error(404);
	return {
		locale: locals.locale,
		region: locals.region,
		/** Escolhas salvas no perfil (nulo = automático, pelo navegador). */
		saved: { locale: user.locale, region: user.region },
		account: {
			username: user.username,
			name: user.name,
			bio: user.bio,
			avatarUrl: user.avatarUrl,
			isPrivate: user.isPrivate
		}
	};
};

export const actions: Actions = {
	/** Nome, bio e privacidade (idioma/região vão para /preferences). */
	profile: async ({ request, locals }) => {
		if (!locals.user) error(401);
		const parsed = profileSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { errors: z.flattenError(parsed.error).fieldErrors });
		}
		await updateProfile(locals.user.id, parsed.data);
		return { profileSaved: true };
	},

	/** Nova foto de perfil (já cortada e reduzida no navegador). */
	avatar: async ({ request, locals }) => {
		if (!locals.user) error(401);
		const file = (await request.formData()).get('avatar');
		if (!(file instanceof File)) return fail(400, { message: m.error_avatar_invalid() });
		try {
			await uploadAvatar(locals.supabase, locals.user.id, file);
		} catch (err) {
			if (err instanceof LibraryRuleError) return fail(400, { message: err.message });
			throw err;
		}
		return { avatarSaved: true };
	},

	removeAvatar: async ({ locals }) => {
		if (!locals.user) error(401);
		await removeAvatar(locals.supabase, locals.user.id);
		return { avatarRemoved: true };
	}
};
