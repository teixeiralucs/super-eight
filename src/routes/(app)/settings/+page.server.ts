import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { profileSchema } from '$lib/schemas/social';
import { prisma } from '$lib/server/db';
import { updateProfile } from '$lib/server/social';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	const user = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: { username: true, name: true, bio: true, isPrivate: true, locale: true, region: true }
	});
	if (!user) error(404);
	return {
		locale: locals.locale,
		region: locals.region,
		/** Escolhas salvas no perfil (nulo = automático, pelo navegador). */
		saved: { locale: user.locale, region: user.region },
		account: { username: user.username, name: user.name, bio: user.bio, isPrivate: user.isPrivate }
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
	}
};
