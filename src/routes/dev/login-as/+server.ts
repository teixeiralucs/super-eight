import { error, redirect } from '@sveltejs/kit';
import { DEV_LOGIN_COOKIE, devLoginEnabled } from '$lib/server/dev-login';
import { safeRedirectPath } from '$lib/server/auth';
import type { RequestHandler } from './$types';

// Só em desenvolvimento (ver $lib/server/dev-login). Em produção: 404.
export const GET: RequestHandler = ({ cookies, url }) => {
	if (!devLoginEnabled()) error(404, 'Not found');
	cookies.set(DEV_LOGIN_COOKIE, '1', { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
	redirect(303, safeRedirectPath(url.searchParams.get('next')));
};
