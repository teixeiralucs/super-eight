import { redirect } from '@sveltejs/kit';
import { isLocale, isRegion } from '$lib/i18n';
import { safeRedirectPath } from '$lib/server/auth';
import { savePreferences } from '$lib/server/preferences';
import type { Actions, PageServerLoad } from './$types';

// Troca de idioma/região (visitantes e logados). Só por POST; volta para a página de origem.
// Sem `use:enhance`: o recarregamento completo aplica o idioma novo em toda a interface.
export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const locale = form.get('locale');
		const region = form.get('region');

		await savePreferences(cookies, locals.user?.id ?? null, {
			locale: isLocale(locale) ? locale : undefined,
			region: isRegion(region) ? region : undefined
		});

		redirect(303, safeRedirectPath(form.get('redirectTo')?.toString(), '/'));
	}
};
