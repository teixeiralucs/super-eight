import BookOpenIcon from '@lucide/svelte/icons/book-open';
import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
import ListVideoIcon from '@lucide/svelte/icons/list-video';
import UsersIcon from '@lucide/svelte/icons/users';
import { m } from '$lib/paraglide/messages';

// Navegação principal da área logada (barra lateral no desktop, barra inferior no celular).
// A busca não entra aqui: ela fica na barra superior. `label` é função: o texto
// depende do idioma de cada requisição.
export const APP_NAV = [
	{ href: '/dashboard', label: m.nav_library, icon: LayoutGridIcon },
	{ href: '/diary', label: m.nav_diary, icon: BookOpenIcon },
	{ href: '/lists', label: m.nav_lists, icon: ListVideoIcon },
	{ href: '/feed', label: m.nav_community, icon: UsersIcon }
] as const;

export type AppNavHref = (typeof APP_NAV)[number]['href'];
