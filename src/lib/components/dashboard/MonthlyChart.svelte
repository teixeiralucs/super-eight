<script lang="ts">
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { MonthBucket } from '$lib/library/stats';

	// Sessões por mês (12 meses). Série única → sem legenda; o título nomeia a série.
	let { months }: { months: MonthBucket[] } = $props();

	const max = $derived(Math.max(1, ...months.map((m) => m.sessions)));
	const total = $derived(months.reduce((sum, m) => sum + m.sessions, 0));
</script>

<section
	aria-labelledby="sessoes-mes"
	class="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6"
>
	<div class="flex items-baseline justify-between gap-4">
		<h2 id="sessoes-mes" class="font-display text-lg font-semibold">{m.monthly_title()}</h2>
		<p class="text-sm text-muted-foreground">
			<span class="text-foreground tabular-nums">{total}</span>
			{m.monthly_last_12()}
		</p>
	</div>

	<!-- Área do gráfico estica até a altura do card vizinho (gêneros) -->
	<div
		class="mt-8 flex min-h-48 flex-1 items-end gap-2 border-b border-white/10 md:gap-3"
		aria-hidden="true"
	>
		{#each months as month (month.key)}
			<div class="group relative flex h-full flex-1 flex-col justify-end">
				<!-- Alvo de hover maior que a barra -->
				<div class="absolute inset-0 rounded-md transition group-hover:bg-white/[0.03]"></div>
				<div
					class="mx-auto w-full max-w-7 rounded-t-[4px] bg-neon-pink transition-opacity group-hover:opacity-100"
					class:opacity-80={month.sessions > 0}
					style:height={month.sessions ? `${(month.sessions / max) * 100}%` : '2px'}
					style:background-color={month.sessions ? undefined : 'rgb(255 255 255 / 0.12)'}
				></div>
				<div
					class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-card px-2.5 py-1.5 text-xs whitespace-nowrap opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100"
				>
					<span class="text-muted-foreground capitalize">{month.label}</span>
					<span class="ml-1.5 font-medium tabular-nums"
						>{plural(month.sessions, m.sessions_count_one, m.sessions_count_other)}</span
					>
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-2 flex gap-2 md:gap-3" aria-hidden="true">
		{#each months as month (month.key)}
			<span class="flex-1 text-center text-[11px] text-muted-foreground capitalize"
				>{month.label}</span
			>
		{/each}
	</div>

	<!-- A <caption> escapa do sr-only aplicado na <table>; por isso o contêiner. -->
	<div class="sr-only">
		<table>
			<caption>{m.monthly_caption()}</caption>
			<thead><tr><th>{m.col_month()}</th><th>{m.col_sessions()}</th></tr></thead>
			<tbody>
				{#each months as month (month.key)}
					<tr><td>{month.label}</td><td>{month.sessions}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
