import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

/**
 * "Entrar como" a conta de teste, SÓ em `npm run dev` — para verificar fluxos logados
 * sem digitar senha. `dev` é constante de build: em produção tudo aqui vira no-op.
 * Só aceita o e-mail de `DEV_LOGIN_EMAIL` (nunca uma conta qualquer).
 */
export const DEV_LOGIN_COOKIE = 'dev-login-as';

export const devLoginEnabled = () => dev && Boolean(env.DEV_LOGIN_EMAIL);

export async function devLoginUser(cookies: Cookies) {
	if (!devLoginEnabled() || cookies.get(DEV_LOGIN_COOKIE) !== '1') return null;
	const user = await prisma.user.findUnique({
		where: { email: env.DEV_LOGIN_EMAIL },
		select: { id: true, email: true }
	});
	return user;
}
