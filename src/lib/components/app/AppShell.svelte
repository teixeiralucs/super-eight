<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import BellIcon from '@lucide/svelte/icons/bell';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { plural } from '$lib/i18n';
	import { APP_NAV } from './nav';

	let {
		profile,
		unread = 0,
		children
	}: {
		/** `null` para visitantes (rotas públicas do grupo, como /search). */
		profile: { username: string; name: string | null; avatarUrl: string | null } | null;
		/** Avisos não lidos (§6.13). */
		unread?: number;
		children: Snippet;
	} = $props();

	const isActive = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	const initial = $derived(
		profile ? (profile.name ?? profile.username).charAt(0).toUpperCase() : ''
	);
	// A página de busca tem o próprio campo grande; o do topo seria redundante.
	const showTopSearch = $derived(!isActive('/search'));
</script>

<div class="min-h-svh pb-24 lg:pb-0 lg:pl-24">
	<!-- Barra lateral flutuante (desktop) -->
	<nav
		aria-label={m.nav_main()}
		class="fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-2 rounded-full border border-white/10 bg-card/95 p-2 lg:flex"
	>
		{#each APP_NAV as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={resolve(item.href)}
				aria-label={item.label()}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class={[
					'group relative grid size-11 place-items-center rounded-full transition',
					isActive(item.href)
						? 'bg-white text-background'
						: 'text-white/60 hover:bg-white/10 hover:text-white'
				]}
			>
				<Icon class="size-[18px]" aria-hidden="true" />
				<span
					class="pointer-events-none absolute left-full ml-3 rounded-md bg-card px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100 group-focus-visible:opacity-100"
					>{item.label()}</span
				>
			</a>
		{/each}
		{#if profile}
			<div class="mx-3 my-1 h-px bg-white/10"></div>
			<a
				href={resolve('/settings')}
				aria-label={m.nav_settings()}
				aria-current={isActive('/settings') ? 'page' : undefined}
				class={[
					'group relative grid size-11 place-items-center rounded-full transition',
					isActive('/settings')
						? 'bg-white text-background'
						: 'text-white/60 hover:bg-white/10 hover:text-white'
				]}
			>
				<SettingsIcon class="size-[18px]" aria-hidden="true" />
				<span
					class="pointer-events-none absolute left-full ml-3 rounded-md bg-card px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100 group-focus-visible:opacity-100"
					>{m.nav_settings()}</span
				>
			</a>
			<form method="POST" action="/logout">
				<button
					class="group relative grid size-11 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
					aria-label={m.nav_logout()}
				>
					<LogOutIcon class="size-[18px]" aria-hidden="true" />
					<span
						class="pointer-events-none absolute left-full ml-3 rounded-md bg-card px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100 group-focus-visible:opacity-100"
						>{m.nav_logout()}</span
					>
				</button>
			</form>
		{/if}
	</nav>

	<!-- Topo -->
	<header class="sticky top-0 z-30 bg-background/95">
		<div class="mx-auto flex h-18 max-w-[1600px] items-center gap-4 px-5 md:px-10">
			<a href={resolve('/')} class="shrink-0" aria-label={m.nav_home()}>
				<Logo class="h-9 w-auto" />
			</a>

			<form
				method="GET"
				action={resolve('/search')}
				role="search"
				class={['mx-auto hidden w-full max-w-md', showTopSearch && 'md:block']}
			>
				<label
					class="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition focus-within:border-neon-cyan/60"
				>
					<SearchIcon class="size-4 text-white/50" aria-hidden="true" />
					<span class="sr-only">{m.search_movies()}</span>
					<input
						name="q"
						type="search"
						placeholder={m.search_movies_placeholder()}
						class="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
					/>
				</label>
			</form>

			<div class={['ml-auto flex items-center gap-3', showTopSearch && 'md:ml-0']}>
				<!-- Celular: o campo do topo some, então a busca vira um ícone -->
				{#if showTopSearch}
					<a
						href={resolve('/search')}
						class="grid size-9 place-items-center rounded-full border border-white/10 text-white/70 transition hover:text-white md:hidden"
						aria-label={m.search_movies()}
					>
						<SearchIcon class="size-4" aria-hidden="true" />
					</a>
				{/if}
				{#if !profile}
					<a
						href={resolve('/login')}
						class="hidden rounded-full px-4 py-2 text-sm text-white/80 transition hover:text-white sm:block"
						>{m.auth_sign_in()}</a
					>
					<a
						href={resolve('/signup')}
						class="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
						>{m.auth_create_account()}</a
					>
				{:else}
					<a
						href={resolve('/notifications')}
						aria-current={isActive('/notifications') ? 'page' : undefined}
						aria-label={unread
							? plural(unread, m.notifications_unread_one, m.notifications_unread_other)
							: m.notifications_title()}
						class={[
							'relative grid size-9 place-items-center rounded-full border transition',
							isActive('/notifications')
								? 'border-white bg-white text-background'
								: 'border-white/10 text-white/70 hover:text-white'
						]}
					>
						<BellIcon class="size-4" aria-hidden="true" />
						{#if unread}
							<span
								class="absolute -top-1 -right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-neon-pink px-1 text-[10px] font-bold text-background tabular-nums"
								aria-hidden="true">{unread > 99 ? '99+' : unread}</span
							>
						{/if}
					</a>
					<a
						href={resolve('/(app)/u/[username]', { username: profile.username })}
						class="hidden text-sm text-white/70 transition hover:text-white sm:block"
						>@{profile.username}</a
					>
					{#if profile.avatarUrl}
						<img
							src={profile.avatarUrl}
							alt=""
							class="size-9 rounded-full object-cover ring-1 ring-white/15"
							referrerpolicy="no-referrer"
						/>
					{:else}
						<span
							class="grid size-9 place-items-center rounded-full bg-linear-to-br from-neon-pink to-neon-purple text-sm font-semibold text-background"
							aria-hidden="true">{initial}</span
						>
					{/if}
				{/if}
			</div>
		</div>
	</header>

	{@render children()}

	<!-- Barra inferior (celular) -->
	<nav
		aria-label={m.nav_main()}
		class="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full border border-white/10 bg-card/95 p-1.5 lg:hidden"
	>
		{#each APP_NAV as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={resolve(item.href)}
				aria-label={item.label()}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class={[
					'grid size-11 place-items-center rounded-full transition',
					isActive(item.href) ? 'bg-white text-background' : 'text-white/60'
				]}
			>
				<Icon class="size-5" aria-hidden="true" />
			</a>
		{/each}
	</nav>
</div>
