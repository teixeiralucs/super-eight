import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Rotas privadas do grupo já foram barradas pelo hook (authGuard). As públicas
	// (ex.: /search) chegam aqui sem usuário e usam o layout em modo visitante.
	if (!locals.user) return { profile: null };

	const profile = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: { username: true, name: true, avatarUrl: true }
	});

	// Se não existir, o trigger auth.users → public."User" falhou.
	if (!profile) error(500, 'Perfil não encontrado.');

	return { profile };
};
