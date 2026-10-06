<script lang="ts">
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { countryName } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	import type { MovieWatchOptions, WatchProviderInfo } from '$lib/tmdb/types';

	/**
	 * Onde assistir na região de quem vê (earlySetup.md §6.12): streaming (assinatura e grátis),
	 * aluguel e compra. Os serviços que a pessoa assina vêm primeiro, destacados. Dados do
	 * JustWatch via TMDb — o crédito é obrigatório.
	 */
	let {
		watch,
		region,
		services = [],
		labelClass
	}: {
		watch: MovieWatchOptions | null;
		region: string;
		/** IDs dos streamings que a pessoa assina. */
		services?: number[];
		labelClass: string;
	} = $props();

	const mineFirst = (providers: WatchProviderInfo[]) =>
		[...providers].sort(
			(a, b) => Number(services.includes(b.id)) - Number(services.includes(a.id))
		);

	const groups = $derived(
		watch
			? [
					{ label: m.watch_stream(), providers: mineFirst(watch.stream) },
					{ label: m.watch_rent(), providers: watch.rent },
					{ label: m.watch_buy(), providers: watch.buy }
				].filter((group) => group.providers.length)
			: []
	);
</script>

<section aria-labelledby="onde-assistir" class="border-t border-white/10 pt-7">
	<div class="flex items-baseline justify-between gap-3">
		<h2 id="onde-assistir" class={labelClass}>{m.watch_title()}</h2>
		<span class="text-[11px] text-white/40">{countryName(region)}</span>
	</div>

	{#if groups.length}
		<div class="mt-3 flex flex-col gap-3">
			{#each groups as group (group.label)}
				<div class="grid grid-cols-[4.5rem_1fr] items-start gap-3">
					<p class="pt-2 text-xs text-white/55">{group.label}</p>
					<ul class="flex flex-wrap gap-2">
						{#each group.providers as provider (provider.id)}
							{@const mine = services.includes(provider.id)}
							<li class="relative">
								<img
									src="https://image.tmdb.org/t/p/w92{provider.logoPath}"
									alt={provider.name}
									title={mine ? `${provider.name} · ${m.watch_subscribed()}` : provider.name}
									loading="lazy"
									class={[
										'size-9 rounded-lg object-cover',
										mine ? 'ring-2 ring-neon-cyan' : 'opacity-85 ring-1 ring-white/10'
									]}
								/>
								{#if mine}
									<span class="sr-only">({m.watch_subscribed()})</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{:else}
		<p class="mt-2 text-sm text-white/55">{m.watch_none({ country: countryName(region) })}</p>
	{/if}

	<div class="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/40">
		{#if watch?.link}
			<!-- Página do TMDb com os links de cada serviço (externa). -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -- link externo -->
			<a
				href={watch.link}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 text-white/60 transition hover:text-white"
			>
				{m.watch_all_options()}
				<ExternalLinkIcon class="size-3" aria-hidden="true" />
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{:else}
			<span></span>
		{/if}
		<span>{m.watch_source()}</span>
	</div>
</section>
