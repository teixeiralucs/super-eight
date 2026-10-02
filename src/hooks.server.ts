import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { devLoginUser } from '$lib/server/dev-login';

/** Rotas que exigem login (earlySetup.md §6.1). */
const PROTECTED_PREFIXES = ['/dashboard', '/diary', '/lists', '/feed'];
/** Rotas que não fazem sentido para quem já está logado. */
const GUEST_ONLY_PREFIXES = ['/login', '/signup'];

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

	if (!event.locals.user && matches(pathname, PROTECTED_PREFIXES)) {
		redirect(303, `/login?next=${encodeURIComponent(pathname + search)}`);
	}

	if (event.locals.user && matches(pathname, GUEST_ONLY_PREFIXES)) {
		redirect(303, '/dashboard');
	}

	return resolve(event);
};

export const handle = sequence(supabase, authGuard);
