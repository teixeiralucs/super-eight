<script lang="ts">
	import UserIcon from '@lucide/svelte/icons/user';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Foto + nome + papel (personagem ou função na equipe). Com `href`, leva aos filmes da
	 * pessoa na biblioteca (§6.10).
	 */
	let {
		name,
		role,
		profilePath,
		href
	}: { name: string; role: string; profilePath: string | null; href?: string } = $props();
</script>

{#snippet content()}
	<div
		class="grid aspect-2/3 place-items-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-neon-pink"
	>
		{#if profilePath}
			<img
				src="https://image.tmdb.org/t/p/w185{profilePath}"
				alt=""
				loading="lazy"
				decoding="async"
				class="size-full object-cover"
			/>
		{:else}
			<UserIcon class="size-8 text-white/20" aria-hidden="true" />
		{/if}
	</div>
	<p class="mt-2 truncate text-sm font-medium group-hover:text-neon-cyan" title={name}>{name}</p>
	<p class="truncate text-xs text-white/55" title={role}>{role}</p>
{/snippet}

<li class="w-28 shrink-0">
	{#if href}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href já vem de resolve() -->
		<a {href} class="group block" title={m.facet_link_title()}>{@render content()}</a>
	{:else}
		{@render content()}
	{/if}
</li>
