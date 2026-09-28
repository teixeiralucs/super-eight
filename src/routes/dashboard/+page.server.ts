import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// O hook já garante o login; a checagem aqui é para o TypeScript e defesa em profundidade.
	if (!locals.user) error(401);

	const profile = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: { username: true, name: true, email: true, avatarUrl: true }
	});

	// Se não existir, o trigger auth.users → public."User" falhou.
	if (!profile) error(500, 'Perfil não encontrado.');

	return { profile };
};
