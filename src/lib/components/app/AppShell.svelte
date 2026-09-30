<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { APP_NAV } from './nav';

	let {
		profile,
		children
	}: {
		profile: { username: string; name: string | null; avatarUrl: string | null };
		children: Snippet;
	} = $props();

	const isActive = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	const initial = $derived((profile.name ?? profile.username).charAt(0).toUpperCase());
</script>

<div class="min-h-svh pb-24 lg:pb-0 lg:pl-24">
	<!-- Barra lateral flutuante (desktop) -->
	<nav
		aria-label="Principal"
		class="fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-2 rounded-full border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl lg:flex"
	>
		{#each APP_NAV as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={resolve(item.href)}
				aria-label={item.label}
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
					>{item.label}</span
				>
			</a>
		{/each}
		<div class="mx-3 my-1 h-px bg-white/10"></div>
		<form method="POST" action="/logout">
			<button
				class="group relative grid size-11 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
				aria-label="Sair"
			>
				<LogOutIcon class="size-[18px]" aria-hidden="true" />
				<span
					class="pointer-events-none absolute left-full ml-3 rounded-md bg-card px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100 group-focus-visible:opacity-100"
					>Sair</span
				>
			</button>
		</form>
	</nav>

	<!-- Topo -->
	<header class="sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
		<div class="mx-auto flex h-18 max-w-[1600px] items-center gap-4 px-5 md:px-10">
			<a href={resolve('/')} class="shrink-0" aria-label="Super Eight — início">
				<Logo class="h-9 w-auto" />
			</a>

			<form
				method="GET"
				action={resolve('/search')}
				role="search"
				class="mx-auto hidden w-full max-w-md md:block"
			>
				<label
					class="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition focus-within:border-neon-cyan/60"
				>
					<SearchIcon class="size-4 text-white/50" aria-hidden="true" />
					<span class="sr-only">Buscar filmes</span>
					<input
						name="q"
						type="search"
						placeholder="Buscar filmes…"
						class="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
					/>
				</label>
			</form>

			<div class="ml-auto flex items-center gap-3 md:ml-0">
				<span class="hidden text-sm text-white/70 sm:block">@{profile.username}</span>
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
			</div>
		</div>
	</header>

	{@render children()}

	<!-- Barra inferior (celular) -->
	<nav
		aria-label="Principal"
		class="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full border border-white/10 bg-background/80 p-1.5 backdrop-blur-xl lg:hidden"
	>
		{#each APP_NAV as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={resolve(item.href)}
				aria-label={item.label}
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
