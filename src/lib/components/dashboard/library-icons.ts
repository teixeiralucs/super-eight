import BookmarkIcon from '@lucide/svelte/icons/bookmark';
import EyeIcon from '@lucide/svelte/icons/eye';
import HeartIcon from '@lucide/svelte/icons/heart';
import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
import type { LibraryView } from '$lib/library/filters';

// Ícones de estado da biblioteca. As abas servem de legenda para os selos dos pôsteres.
export const VIEW_ICONS = {
	all: { icon: LayoutGridIcon, color: 'text-white/60' },
	watched: { icon: EyeIcon, color: 'text-neon-cyan' },
	watchlist: { icon: BookmarkIcon, color: 'text-white/80' },
	favorites: { icon: HeartIcon, color: 'text-neon-pink' }
} satisfies Record<LibraryView, { icon: unknown; color: string }>;
