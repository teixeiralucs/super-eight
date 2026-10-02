import type { Cookies } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { isLocale, isRegion, REGION_COOKIE, type Locale } from '$lib/i18n';

// Idioma e região do usuário (earlySetup.md §6.5): os cookies valem para a requisição
// (lidos no hook); o perfil guarda a escolha para outros dispositivos.

const YEAR_SECONDS = 60 * 60 * 24 * 365;
// Não é httpOnly: o Paraglide lê o idioma do cookie também no navegador.
const COOKIE = { path: '/', httpOnly: false, sameSite: 'lax', maxAge: YEAR_SECONDS } as const;

export function setPreferenceCookies(
	cookies: Cookies,
	{ locale, region }: { locale?: Locale; region?: string }
) {
	if (locale) cookies.set('locale', locale, COOKIE);
	if (region) cookies.set(REGION_COOKIE, region, COOKIE);
}

/** Salva no perfil (se logado) e nos cookies. */
export async function savePreferences(
	cookies: Cookies,
	userId: string | null,
	prefs: { locale?: Locale; region?: string }
) {
	if (userId) await prisma.user.update({ where: { id: userId }, data: prefs });
	setPreferenceCookies(cookies, prefs);
}

/**
 * Depois do login: o que está no perfil vale (escolha feita em outro dispositivo); o que o
 * perfil ainda não tem é preenchido com o que este navegador já usa.
 */
export async function syncPreferencesOnLogin(
	cookies: Cookies,
	userId: string,
	current: { locale: Locale; region: string }
) {
	const profile = await prisma.user.findUnique({
		where: { id: userId },
		select: { locale: true, region: true }
	});
	if (!profile) return;

	const locale = isLocale(profile.locale) ? profile.locale : current.locale;
	const region = isRegion(profile.region) ? profile.region : current.region;
	setPreferenceCookies(cookies, { locale, region });
	if (profile.locale !== locale || profile.region !== region) {
		await prisma.user.update({ where: { id: userId }, data: { locale, region } });
	}
}
