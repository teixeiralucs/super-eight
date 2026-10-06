import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { devLoginUser } from '$lib/server/dev-login';
import {
	DEFAULT_REGION,
	INTL_LOCALE,
	isRegion,
	REGION_COOKIE,
	regionFromAcceptLanguage
} from '$lib/i18n';
import { paraglideMiddleware } from '$lib/paraglide/server';

const YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Idioma (Paraglide: cookie `locale` → idioma do navegador → pt) e região (cookie `region`
 * → país do `Accept-Language` → padrão do idioma). Na 1ª visita grava os dois cookies,
 * para servidor e navegador concordarem. Roda primeiro: os demais hooks e os `load`
 * já executam dentro do idioma da requisição.
 */
const i18n: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		const cookie = { path: '/', httpOnly: false, sameSite: 'lax', maxAge: YEAR_SECONDS } as const;
		if (event.cookies.get('locale') !== locale) event.cookies.set('locale', locale, cookie);

		let region = event.cookies.get(REGION_COOKIE);
		if (!isRegion(region)) {
			region =
				regionFromAcceptLanguage(request.headers.get('accept-language')) ?? DEFAULT_REGION[locale];
			event.cookies.set(REGION_COOKIE, region, cookie);
		}

		event.locals.locale = locale;
		event.locals.region = region;
		return resolve(
			{ ...event, request },
			{ transformPageChunk: ({ html }) => html.replace('%lang%', INTL_LOCALE[locale]) }
		);
	});

/** Rotas que exigem login (earlySetup.md §6.1). */
const PROTECTED_PREFIXES = [
	'/dashboard',
	'/diary',
	'/feed',
	'/settings',
	'/reset-password',
	// Coleções do TMDb mostram a biblioteca de quem vê.
	'/lists/collections',
	// Páginas filtradas da biblioteca (pessoa, país, estúdio…).
	'/library'
];
/** Protegidas só na rota exata: `/lists/[id]` público abre para qualquer pessoa. */
const PROTECTED_EXACT = ['/lists'];
/** Rotas que não fazem sentido para quem já está logado. */
const GUEST_ONLY_PREFIXES = ['/login', '/signup', '/forgot-password'];

const matches = (pathname: string, prefixes: string[]) =>
	prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				// `path: '/'` é obrigatório no SvelteKit para o cookie valer no site inteiro.
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				);
			}
		}
	});

	// getClaims verifica a assinatura do JWT; getSession sozinho não é confiável no servidor.
	const { data } = await event.locals.supabase.auth.getClaims();
	event.locals.user = data?.claims
		? { id: data.claims.sub, email: data.claims.email as string | undefined }
		: null;
	// Só em `npm run dev`: conta de teste para verificações (ver $lib/server/dev-login).
	event.locals.user ??= await devLoginUser(event.cookies);

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;

	const isProtected =
		matches(pathname, PROTECTED_PREFIXES) || PROTECTED_EXACT.includes(pathname.replace(/\/$/, ''));
	if (!event.locals.user && isProtected) {
		redirect(303, `/login?next=${encodeURIComponent(pathname + search)}`);
	}

	if (event.locals.user && matches(pathname, GUEST_ONLY_PREFIXES)) {
		redirect(303, '/dashboard');
	}

	return resolve(event);
};

export const handle = sequence(i18n, supabase, authGuard);

/**
 * Erros inesperados (earlySetup.md §6.4.6): o detalhe vai para o log; a tela mostra só um
 * texto genérico traduzido (ErrorView). Rota inexistente (404) não precisa de log.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	if (status !== 404) {
		console.error(`[erro ${status}] ${event.request.method} ${event.url.pathname}:`, error);
	}
	return { message };
};
