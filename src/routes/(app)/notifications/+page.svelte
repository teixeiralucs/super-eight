<script lang="ts">
	import { resolve } from '$app/paths';
	import BellIcon from '@lucide/svelte/icons/bell';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import Avatar from '$lib/components/social/Avatar.svelte';
	import { formatRelative } from '$lib/format';
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { NotificationItem, NotificationKind } from '$lib/social/notifications';
	import { posterUrl } from '$lib/tmdb/images';
	import type { PageData } from './$types';

	/**
	 * Avisos (earlySetup.md §6.13): quem te seguiu, curtiu sua review/lista ou comentou. Os não
	 * lidos (até esta visita) ficam destacados; curtidas no mesmo alvo vêm agrupadas.
	 */
	let { data }: { data: PageData } = $props();

	const ICONS: Record<NotificationKind, { icon: typeof BellIcon; color: string }> = {
		FOLLOW: { icon: UserPlusIcon, color: 'text-neon-cyan' },
		REVIEW_LIKE: { icon: HeartIcon, color: 'text-neon-pink' },
		LIST_LIKE: { icon: HeartIcon, color: 'text-neon-pink' },
		REVIEW_COMMENT: { icon: MessageCircleIcon, color: 'text-neon-purple' },
		REVIEW_REPLY: { icon: MessageCircleIcon, color: 'text-neon-purple' },
		LIST_COMMENT: { icon: MessageCircleIcon, color: 'text-neon-purple' },
		LIST_REPLY: { icon: MessageCircleIcon, color: 'text-neon-purple' }
	};

	/** Para onde o aviso leva: perfil, aba de reviews do filme ou a lista (nos comentários). */
	function hrefOf(item: NotificationItem) {
		if (item.type === 'FOLLOW') {
			return resolve('/(app)/u/[username]', { username: item.actors[0].username });
		}
		if (item.list) {
			const path = resolve('/(app)/lists/[id]', { id: item.list.id });
			return item.type === 'LIST_LIKE' ? path : `${path}#comentarios`;
		}
		if (item.movie) return `${resolve('/movie/[id]', { id: String(item.movie.id) })}?tab=reviews`;
		return resolve('/notifications');
	}

	/** O que aconteceu (o nome de quem fez e o alvo vêm em destaque, fora da frase). */
	function action(item: NotificationItem) {
		const many = item.actors.length;
		switch (item.type) {
			case 'FOLLOW':
				return m.notif_follow();
			case 'REVIEW_LIKE':
				return plural(many, m.notif_review_like_one, m.notif_review_like_other);
			case 'LIST_LIKE':
				return plural(many, m.notif_list_like_one, m.notif_list_like_other);
			case 'REVIEW_COMMENT':
				return m.notif_review_comment();
			case 'REVIEW_REPLY':
				return m.notif_review_reply();
			case 'LIST_COMMENT':
				return m.notif_list_comment();
			case 'LIST_REPLY':
				return m.notif_list_reply();
		}
	}

	const displayName = (actor: NotificationItem['actors'][number]) =>
		actor.name ?? `@${actor.username}`;
</script>

<svelte:head>
	<title>{m.notifications_page_title()}</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="pb-2">
		<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">{m.nav_community()}</p>
		<h1
			class="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-none font-bold tracking-[-0.04em]"
		>
			{m.notifications_title()}<span
				class="font-serif font-normal tracking-normal text-white/40 italic">.</span
			>
		</h1>
	</header>

	{#if !data.items.length}
		<div
			class="flex flex-col items-center gap-3 rounded-3xl border border-white/10 px-6 py-16 text-center"
		>
			<BellIcon class="size-8 text-white/30" aria-hidden="true" />
			<p class="max-w-sm text-muted-foreground">{m.notifications_empty()}</p>
			<a
				href={resolve('/feed')}
				class="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
				>{m.notifications_empty_cta()}</a
			>
		</div>
	{:else}
		<ol class="flex flex-col gap-2">
			{#each data.items as item (item.id)}
				{@const { icon: Icon, color } = ICONS[item.type]}
				{@const others = item.actors.length - 1}
				<li>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- hrefOf usa resolve() (+ ?tab) -->
					<a
						href={hrefOf(item)}
						class={[
							'flex items-start gap-4 rounded-2xl border p-4 transition hover:bg-white/[0.05]',
							item.unread
								? 'border-neon-cyan/25 bg-neon-cyan/[0.04]'
								: 'border-white/5 bg-white/[0.02]'
						]}
					>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
						<span class="relative shrink-0">
							<Avatar user={item.actors[0]} class="size-10 text-sm" />
							<span
								class="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-background ring-1 ring-white/10"
							>
								<Icon class={['size-3', color, item.type.endsWith('LIKE') && 'fill-current']} />
							</span>
						</span>

						<div class="min-w-0 flex-1">
							<p class="text-sm leading-relaxed text-white/75">
								<span class="font-semibold text-white">{displayName(item.actors[0])}</span>
								{#if others > 0}
									{plural(others, m.notif_and_others_one, m.notif_and_others_other)}
								{/if}
								{action(item)}
								{#if item.movie}
									<span class="font-semibold text-white">{item.movie.title}</span>
								{:else if item.list}
									<span class="font-semibold text-white">{item.list.title}</span>
								{/if}
							</p>
							{#if item.comment}
								<p
									class="mt-2 line-clamp-2 border-l-2 border-white/15 pl-3 text-sm text-white/60 italic"
								>
									{item.comment}
								</p>
							{/if}
							{#if others > 0}
								<div class="mt-2 flex -space-x-2" aria-hidden="true">
									{#each item.actors.slice(1, 6) as actor (actor.username)}
										<Avatar user={actor} class="size-6 text-[10px] ring-2 ring-background" />
									{/each}
								</div>
							{/if}
							<p class="mt-1.5 flex items-center gap-2 text-xs text-white/40">
								{#if item.unread}
									<span class="size-1.5 rounded-full bg-neon-cyan" aria-hidden="true"></span>
									<span class="sr-only">{m.notifications_new()}</span>
								{/if}
								{formatRelative(item.createdAt)}
							</p>
						</div>

						{#if item.movie?.posterPath}
							<img
								src={posterUrl(item.movie.posterPath, 'w185')}
								alt=""
								loading="lazy"
								class="h-16 w-11 shrink-0 rounded-md object-cover ring-1 ring-white/10"
							/>
						{/if}
					</a>
				</li>
			{/each}
		</ol>
	{/if}
</main>
