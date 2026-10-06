<script lang="ts" module>
	export interface RankRow {
		key: string | number;
		label: string;
		count: number;
		averageRating: number | null;
		/** Página da biblioteca filtrada (§6.10). */
		href?: string;
		imagePath?: string | null;
	}
</script>

<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import StarIcon from '@lucide/svelte/icons/star';
	import UserIcon from '@lucide/svelte/icons/user';
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	// Ranking com barra (série única) e, para pessoas/estúdios, foto ou logo. Cada linha leva
	// aos seus filmes na biblioteca.
	let {
		id,
		title,
		rows,
		color = 'bg-neon-cyan',
		image
	}: {
		id: string;
		title: string;
		rows: RankRow[];
		color?: string;
		/** Tipo de imagem ao lado do nome (nenhuma por padrão). */
		image?: 'person' | 'logo';
	} = $props();

	const max = $derived(Math.max(1, ...rows.map((row) => row.count)));
</script>

<section
	aria-labelledby={id}
	class="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6"
>
	<h2 {id} class="font-display text-lg font-semibold">{title}</h2>

	{#if rows.length}
		<ol class="mt-5 flex flex-col gap-1">
			{#each rows as row, i (row.key)}
				<li>
					<svelte:element
						this={row.href ? 'a' : 'div'}
						href={row.href}
						class={[
							'grid items-center gap-3 rounded-xl px-2 py-2 text-sm transition',
							image ? 'grid-cols-[1.25rem_2.25rem_1fr_auto]' : 'grid-cols-[1.25rem_1fr_auto]',
							row.href && 'hover:bg-white/5'
						]}
					>
						<span class="font-mono text-xs text-muted-foreground">{i + 1}</span>
						{#if image === 'person'}
							{#if row.imagePath}
								<img
									src="https://image.tmdb.org/t/p/w92{row.imagePath}"
									alt=""
									loading="lazy"
									class="size-9 rounded-full object-cover ring-1 ring-white/10"
								/>
							{:else}
								<span class="grid size-9 place-items-center rounded-full bg-white/5"
									><UserIcon class="size-4 text-white/40" aria-hidden="true" /></span
								>
							{/if}
						{:else if image === 'logo'}
							<span class="grid size-9 place-items-center rounded-lg bg-white/90 p-1">
								{#if row.imagePath}
									<img
										src="https://image.tmdb.org/t/p/w92{row.imagePath}"
										alt=""
										loading="lazy"
										class="max-h-full max-w-full object-contain"
									/>
								{:else}
									<Building2Icon class="size-4 text-background/50" aria-hidden="true" />
								{/if}
							</span>
						{/if}
						<div class="min-w-0">
							<p class="mb-1.5 truncate first-letter:uppercase">{row.label}</p>
							<div class="h-1.5 rounded-full bg-white/[0.06]">
								<div
									class={['h-full rounded-full', color]}
									style:width={`${(row.count / max) * 100}%`}
								></div>
							</div>
						</div>
						<span class="flex flex-col items-end self-end text-right">
							<span class="text-muted-foreground tabular-nums"
								><span aria-hidden="true">{row.count}</span><span class="sr-only"
									>{plural(row.count, m.movies_count_one, m.movies_count_other)}</span
								></span
							>
							{#if row.averageRating !== null}
								<span
									class="flex items-center gap-0.5 text-[11px] text-white/40 tabular-nums"
									title={m.stats_rank_average()}
								>
									<StarIcon class="size-2.5 fill-current" aria-hidden="true" />
									{row.averageRating.toFixed(1)}
									<span class="sr-only">{m.stats_rank_average()}</span>
								</span>
							{/if}
						</span>
					</svelte:element>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="mt-5 text-sm text-muted-foreground">{m.stats_rank_empty()}</p>
	{/if}
</section>
