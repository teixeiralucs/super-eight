import { getLocale, locales, type Locale } from '$lib/paraglide/runtime';

// Idiomas e regiões (earlySetup.md §6.5). O idioma vem do Paraglide (cookie `locale`,
// espelhado no perfil); a região é independente (cookie `region`, também no perfil).

export type { Locale };
export { locales };

/** Idioma pedido ao TMDb para cada idioma do app (espanhol = América Latina). */
export const TMDB_LANGUAGE: Record<Locale, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-MX' };

/** Locale do `Intl` (datas, números, nomes de países) para cada idioma. */
export const INTL_LOCALE: Record<Locale, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-MX' };

/** Nome de cada idioma nele mesmo (para o seletor). */
export const LOCALE_NAMES: Record<Locale, string> = {
	pt: 'Português',
	en: 'English',
	es: 'Español'
};

/** Região padrão quando o usuário ainda não escolheu e o navegador não diz. */
export const DEFAULT_REGION: Record<Locale, string> = { pt: 'BR', en: 'US', es: 'MX' };

/** Países oferecidos no seletor (ISO 3166-1). Afeta "Em cartaz", populares e estreia local. */
export const REGIONS = [
	'BR',
	'PT',
	'US',
	'CA',
	'GB',
	'IE',
	'AU',
	'MX',
	'AR',
	'CL',
	'CO',
	'PE',
	'UY',
	'ES',
	'FR',
	'DE',
	'IT',
	'JP',
	'KR'
] as const;

export const REGION_COOKIE = 'region';

export const isLocale = (value: unknown): value is Locale =>
	typeof value === 'string' && (locales as readonly string[]).includes(value);

export const isRegion = (value: unknown): value is string =>
	typeof value === 'string' && (REGIONS as readonly string[]).includes(value);

/** Idioma atual (servidor: por requisição; navegador: o da página). */
export const currentLocale = (): Locale => getLocale();
export const intlLocale = (locale: Locale = getLocale()) => INTL_LOCALE[locale];
export const tmdbLanguage = (locale: Locale = getLocale()) => TMDB_LANGUAGE[locale];

type CountMessage<P> = (inputs: P & { count: number }) => string;

/**
 * Singular/plural (as regras de pt, en e es coincidem: 1 = singular).
 * Ex.: `plural(n, m.sessions_count_one, m.sessions_count_other)` → "1 sessão" / "3 sessões".
 */
export function plural<P extends object = object>(
	count: number,
	one: CountMessage<P>,
	other: CountMessage<P>,
	params = {} as P
) {
	return (count === 1 ? one : other)({ ...params, count });
}

/** Região sugerida pelo `Accept-Language` ("es-AR,es;q=0.9" → "AR"), se for uma das oferecidas. */
export function regionFromAcceptLanguage(header: string | null) {
	for (const part of header?.split(',') ?? []) {
		const region = part.split(';')[0].trim().split('-')[1]?.toUpperCase();
		if (isRegion(region)) return region;
	}
	return null;
}
