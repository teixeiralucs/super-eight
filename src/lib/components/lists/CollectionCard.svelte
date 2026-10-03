<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CollectionSummary } from '$lib/lists/types';
	import { m } from '$lib/paraglide/messages';
	import { backdropUrl } from '$lib/tmdb/images';

	/**
	 * Card de coleção (saga do TMDb ou lista oficial do Trakt): fundo, nome e quantos filmes
	 * dela o usuário tem.
	 */
	let { collection }: { collection: CollectionSummary } = $props();

	const href = $derived(
		collection.source === 'trakt'
			? resolve('/(app)/lists/collections/trakt/[id]', { id: String(collection.id) })
			: resolve('/(app)/lists/collections/[id]', { id: String(collection.id) })
	);

	const complete = $derived(collection.owned >= collection.total);
</script>

<a
	{href}
	aria-label={m.collection_open({ name: collection.name })}
	class="group relative isolate flex aspect-[16/8] flex-col justify-end overflow-hidden rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/10 transition duration-300 hover:ring-2 hover:ring-neon-pink md:p-8"
>
	{#if collection.backdropPath}
		<div
			class="absolute inset-0 -z-10 bg-cover bg-center"
			style:background-image="url({backdropUrl(collection.backdropPath, 'w300')})"
		>
			<img
				src={backdropUrl(collection.backdropPath, 'w780')}
				alt=""
				loading="lazy"
				decoding="async"
				class="size-full object-cover"
			/>
		</div>
	{:else}
		<div
			class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--neon-cyan)_18%,transparent),transparent_65%)]"
		></div>
	{/if}
	<div
		class="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/55 to-background/0"
	></div>

	<p class="text-[11px] font-semibold tracking-[0.2em] text-neon-cyan uppercase">
		{collection.source === 'trakt' ? m.collection_kicker_trakt() : m.collection_kicker()}
	</p>
	<div class="mt-2 flex items-end justify-between gap-6">
		<h2
			class="font-display text-[clamp(1.75rem,3.5vw,3rem)] leading-[0.95] font-bold tracking-[-0.03em] text-balance"
		>
			{collection.name}
		</h2>
		<span
			class="shrink-0 font-display text-3xl font-light text-white/80 tabular-nums md:text-4xl"
			aria-label={m.collection_progress_label({ owned: collection.owned, total: collection.total })}
			>{m.collection_progress({ owned: collection.owned, total: collection.total })}</span
		>
	</div>
	<!-- Progresso da saga -->
	<div class="mt-4 h-1 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
		<div
			class={['h-full rounded-full', complete ? 'bg-neon-pink' : 'bg-neon-cyan']}
			style:width="{Math.min(100, (collection.owned / collection.total) * 100)}%"
		></div>
	</div>
</a>
