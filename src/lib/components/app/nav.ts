import BookOpenIcon from '@lucide/svelte/icons/book-open';
import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
import ListVideoIcon from '@lucide/svelte/icons/list-video';
import SearchIcon from '@lucide/svelte/icons/search';
import UsersIcon from '@lucide/svelte/icons/users';

// Navegação principal da área logada (barra lateral no desktop, barra inferior no celular).
export const APP_NAV = [
	{ href: '/dashboard', label: 'Biblioteca', icon: LayoutGridIcon },
	{ href: '/search', label: 'Buscar', icon: SearchIcon },
	{ href: '/diary', label: 'Diário', icon: BookOpenIcon },
	{ href: '/lists', label: 'Listas', icon: ListVideoIcon },
	{ href: '/feed', label: 'Comunidade', icon: UsersIcon }
] as const;

export type AppNavHref = (typeof APP_NAV)[number]['href'];
