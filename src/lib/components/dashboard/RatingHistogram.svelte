<script lang="ts">
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	// Mini histograma de notas 1–10 dentro do cartão "Nota média". Série única (roxo).
	let { histogram }: { histogram: { rating: number; count: number }[] } = $props();

	const max = $derived(Math.max(1, ...histogram.map((h) => h.count)));
</script>

<div>
	<div class="flex h-14 items-end gap-1" aria-hidden="true">
		{#each histogram as { rating, count } (rating)}
			<div class="group relative flex h-full flex-1 flex-col justify-end">
				<div
					class="rounded-t-[3px] bg-neon-purple"
					style:height={count ? `${(count / max) * 100}%` : '2px'}
					style:background-color={count ? undefined : 'rgb(255 255 255 / 0.12)'}
				></div>
				<div
					class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-card px-2 py-1 text-xs whitespace-nowrap opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100"
				>
					{m.histogram_bar({ rating })}
					<span class="font-medium tabular-nums"
						>{plural(count, m.movies_count_one, m.movies_count_other)}</span
					>
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-1.5 flex justify-between text-[10px] text-muted-foreground" aria-hidden="true">
		<span>1</span><span>10</span>
	</div>
	<!-- A <caption> escapa do sr-only aplicado na <table>; por isso o contêiner. -->
	<div class="sr-only">
		<table>
			<caption>{m.histogram_caption()}</caption>
			<thead><tr><th>{m.col_rating()}</th><th>{m.col_movies()}</th></tr></thead>
			<tbody>
				{#each histogram as { rating, count } (rating)}
					<tr><td>{rating}</td><td>{count}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
