<script lang="ts">
	// Gráfico de colunas de série única (sessões por mês/ano, dia da semana, década).
	// O título nomeia a série; o valor de cada coluna aparece no hover e na tabela sr-only.
	let {
		id,
		title,
		subtitle,
		bars,
		color = 'bg-neon-pink',
		valueLabel,
		columnLabel
	}: {
		id: string;
		title: string;
		subtitle?: string;
		bars: { key: string; label: string; value: number }[];
		color?: string;
		/** Texto do valor no hover ("3 sessões"). */
		valueLabel: (value: number) => string;
		/** Cabeçalho da coluna de rótulos na tabela acessível. */
		columnLabel: string;
	} = $props();

	const max = $derived(Math.max(1, ...bars.map((bar) => bar.value)));
	// Muitas colunas (ex.: 20 anos): rótulo em uma sim, uma não.
	const sparse = $derived(bars.length > 14);
</script>

<section
	aria-labelledby={id}
	class="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6"
>
	<h2 {id} class="font-display text-lg font-semibold">{title}</h2>
	{#if subtitle}<p class="mt-1 text-sm text-muted-foreground">{subtitle}</p>{/if}

	<div
		class="mt-8 flex h-44 flex-auto items-end gap-1.5 border-b border-white/10 md:gap-2.5"
		aria-hidden="true"
	>
		{#each bars as bar (bar.key)}
			<div class="group relative flex h-full flex-1 flex-col justify-end">
				<div class="absolute inset-0 rounded-md transition group-hover:bg-white/[0.03]"></div>
				<div
					class={['mx-auto w-full max-w-7 rounded-t-[4px]', bar.value && [color, 'opacity-80']]}
					style:height={bar.value ? `${(bar.value / max) * 100}%` : '2px'}
					style:background-color={bar.value ? undefined : 'rgb(255 255 255 / 0.12)'}
				></div>
				<div
					class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-card px-2.5 py-1.5 text-xs whitespace-nowrap opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100"
				>
					<span class="text-muted-foreground capitalize">{bar.label}</span>
					<span class="ml-1.5 font-medium tabular-nums">{valueLabel(bar.value)}</span>
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-2 flex gap-1.5 md:gap-2.5" aria-hidden="true">
		{#each bars as bar, i (bar.key)}
			<span class="flex-1 text-center text-[11px] text-muted-foreground capitalize tabular-nums"
				>{sparse && i % 2 ? '' : bar.label}</span
			>
		{/each}
	</div>

	<div class="sr-only">
		<table>
			<caption>{title}</caption>
			<thead><tr><th>{columnLabel}</th><th>{title}</th></tr></thead>
			<tbody>
				{#each bars as bar (bar.key)}
					<tr><td>{bar.label}</td><td>{bar.value}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
