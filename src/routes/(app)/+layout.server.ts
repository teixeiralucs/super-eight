import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { countUnread } from '$lib/server/notifications';
import { m } from '$lib/paraglide/messages';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Rotas privadas do grupo já foram barradas pelo hook (authGuard). As públicas
	// (ex.: /search) chegam aqui sem usuário e usam o layout em modo visitante.
	if (!locals.user) return { profile: null, unread: 0 };

	// Ler `url` faz o layout recarregar a cada navegação: o sino fica em dia (§6.13).
	// Na própria página de avisos eles acabaram de ser lidos.
	const onNotifications = url.pathname === '/notifications';
	const [profile, unread] = await Promise.all([
		prisma.user.findUnique({
			where: { id: locals.user.id },
			select: { username: true, name: true, avatarUrl: true }
		}),
		onNotifications ? 0 : countUnread(locals.user.id)
	]);

	// Se não existir, o trigger auth.users → public."User" falhou.
	if (!profile) error(500, m.error_profile_not_found());

	return { profile, unread };
};
