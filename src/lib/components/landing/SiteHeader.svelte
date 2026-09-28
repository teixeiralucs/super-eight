<script lang="ts">
	import { resolve } from '$app/paths';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Logo from '$lib/components/brand/Logo.svelte';

	let { user }: { user: SessionUser | null } = $props();

	let scrolled = $state(false);
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 24)} />

<header
	class={[
		'fixed inset-x-0 top-0 z-50 transition-colors duration-500',
		scrolled ? 'bg-background/70 backdrop-blur-xl' : 'bg-transparent'
	]}
>
	<div class="mx-auto flex h-18 max-w-[1600px] items-center justify-between gap-4 px-5 md:px-10">
		<a href={resolve('/')} class="shrink-0" aria-label="Super Eight — início">
			<Logo class="h-9 w-auto md:h-10" />
		</a>

		<nav
			aria-label="Principal"
			class="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-sm backdrop-blur-md lg:flex"
		>
			<a href="#em-alta" class="rounded-full px-4 py-1.5 text-white/80 transition hover:text-white"
				>Em alta</a
			>
			<a
				href="#em-cartaz"
				class="rounded-full px-4 py-1.5 text-white/80 transition hover:text-white">Em cartaz</a
			>
			<a href="#recursos" class="rounded-full px-4 py-1.5 text-white/80 transition hover:text-white"
				>Recursos</a
			>
			<a
				href={resolve('/search')}
				class="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-white transition hover:bg-white/15"
			>
				<SearchIcon class="size-3.5" aria-hidden="true" />
				Buscar
			</a>
		</nav>

		<div class="flex items-center gap-2 text-sm">
			{#if user}
				<a
					href={resolve('/dashboard')}
					class="rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground transition hover:shadow-[0_0_24px_var(--neon-pink)]"
					>Minha biblioteca</a
				>
			{:else}
				<a
					href={resolve('/login')}
					class="hidden rounded-full px-4 py-2 text-white/80 transition hover:text-white sm:block"
					>Entrar</a
				>
				<a
					href={resolve('/signup')}
					class="rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground transition hover:shadow-[0_0_24px_var(--neon-pink)]"
					>Criar conta</a
				>
			{/if}
		</div>
	</div>
</header>
