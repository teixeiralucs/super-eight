import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401);
	const profile = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: { locale: true, region: true }
	});
	return {
		locale: locals.locale,
		region: locals.region,
		/** Escolhas salvas no perfil (nulo = automático, pelo navegador). */
		saved: profile ?? { locale: null, region: null }
	};
};
