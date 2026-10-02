<script lang="ts">
	import { resolve } from '$app/paths';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import LockIcon from '@lucide/svelte/icons/lock';
	import { plural } from '$lib/i18n';
	import type { ListSummary } from '$lib/lists/types';
	import { m } from '$lib/paraglide/messages';
	import { backdropUrl } from '$lib/tmdb/images';

	/** Card de lista: fundo do 1º filme em destaque e o título grande por cima. */
	let { list }: { list: ListSummary } = $props();
</script>

<a
	href={resolve('/(app)/lists/[id]', { id: list.id })}
	aria-label={m.list_open({ title: list.title })}
	class="group relative isolate flex aspect-[16/8] flex-col justify-end overflow-hidden rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/10 transition duration-300 hover:ring-2 hover:ring-neon-pink md:p-8"
>
	{#if list.cover?.backdropPath}
		<!-- w300 ampliado como prévia enquanto o w780 carrega (sem filter: blur) -->
		<div
			class="absolute inset-0 -z-10 bg-cover bg-center"
			style:background-image="url({backdropUrl(list.cover.backdropPath, 'w300')})"
		>
			<img
				src={backdropUrl(list.cover.backdropPath, 'w780')}
				alt=""
				loading="lazy"
				decoding="async"
				class="size-full object-cover"
			/>
		</div>
	{:else}
		<div
			class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--neon-purple)_22%,transparent),transparent_65%)]"
		></div>
	{/if}
	<div
		class="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/55 to-background/0"
	></div>

	<div class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
		<span class="inline-flex items-center gap-1.5 text-neon-cyan">
			{#if list.kind === 'RANKED'}<ListOrderedIcon class="size-3.5" aria-hidden="true" />{/if}
			{list.kind === 'RANKED' ? m.list_kind_ranked() : m.list_kind_collection()}
		</span>
		<span class="text-white/30" aria-hidden="true">·</span>
		<span class="inline-flex items-center gap-1.5 text-white/60">
			{#if list.isPublic}
				<GlobeIcon class="size-3.5" aria-hidden="true" />{m.list_public()}
			{:else}
				<LockIcon class="size-3.5" aria-hidden="true" />{m.list_private()}
			{/if}
		</span>
	</div>
	<div class="mt-2 flex items-end justify-between gap-6">
		<h2
			class="font-display text-[clamp(1.75rem,3.5vw,3rem)] leading-[0.95] font-bold tracking-[-0.03em] text-balance"
		>
			{list.title}
		</h2>
		<span class="shrink-0 font-display text-3xl font-light text-white/80 tabular-nums md:text-4xl"
			>{list.count}</span
		>
	</div>
	<p class="mt-2 flex items-baseline justify-between gap-4 text-sm text-white/60">
		<span class="line-clamp-1">{list.description ?? ''}</span>
		<span class="shrink-0 text-xs"
			>{plural(list.count, m.movies_count_one, m.movies_count_other)}</span
		>
	</p>
</a>
