<script lang="ts">
	import { enhance } from '$app/forms';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { withFeedback } from '$lib/feedback/submit';
	import { countryName } from '$lib/format';
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	/**
	 * "Meus streamings" (earlySetup.md §6.12): os serviços que a pessoa assina, entre os do país
	 * dela. Aparecem primeiro os mais populares (e os já marcados); o resto fica atrás de
	 * "Mostrar todos".
	 */
	let {
		providers,
		selected,
		region,
		class: className
	}: {
		providers: { id: number; name: string; logoPath: string | null }[] | null;
		selected: number[];
		region: string;
		class: string;
	} = $props();

	const FEATURED = 18;
	let showAll = $state(false);
	// Estado local (volta ao salvo quando a página recarrega os dados).
	let chosen = $derived([...selected]);

	const visible = $derived(
		!providers || showAll
			? (providers ?? [])
			: providers.filter((provider, i) => i < FEATURED || selected.includes(provider.id))
	);

	function toggle(id: number) {
		chosen = chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id];
	}
</script>

<form
	method="POST"
	action="?/streaming"
	use:enhance={withFeedback(
		() =>
			async ({ update }) =>
				update({ reset: false }),
		{ success: m.settings_streaming_saved() }
	)}
	class={className}
	aria-labelledby="streaming-title"
>
	<div>
		<h2 id="streaming-title" class="font-display text-lg font-semibold">
			{m.settings_streaming_title()}
		</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			{m.settings_streaming_desc({ country: countryName(region) })}
		</p>
	</div>

	{#if providers}
		<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each visible as provider (provider.id)}
				{@const on = chosen.includes(provider.id)}
				<li>
					<label
						class={[
							'flex cursor-pointer items-center gap-3 rounded-2xl border p-2 pr-3 text-sm transition',
							on
								? 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
								: 'border-white/10 text-white/75 hover:border-white/25'
						]}
					>
						<input
							type="checkbox"
							name="service"
							value={provider.id}
							checked={on}
							onchange={() => toggle(provider.id)}
							class="sr-only"
						/>
						<img
							src="https://image.tmdb.org/t/p/w92{provider.logoPath}"
							alt=""
							loading="lazy"
							class="size-8 shrink-0 rounded-lg object-cover"
						/>
						<span class="min-w-0 flex-1 truncate">{provider.name}</span>
						{#if on}<CheckIcon class="size-4 shrink-0 text-neon-cyan" aria-hidden="true" />{/if}
					</label>
				</li>
			{/each}
		</ul>

		<!-- Marcados que estão escondidos ("Mostrar menos") também vão no envio -->
		{#each chosen.filter((id) => !visible.some((provider) => provider.id === id)) as id (id)}
			<input type="hidden" name="service" value={id} />
		{/each}

		<div class="flex flex-wrap items-center gap-4">
			<button
				class="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-background transition hover:bg-white/85 disabled:opacity-60"
			>
				{m.settings_save()}
			</button>
			<span class="text-sm text-muted-foreground tabular-nums">
				{plural(chosen.length, m.settings_streaming_count_one, m.settings_streaming_count_other)}
			</span>
			{#if providers.length > FEATURED}
				<button
					type="button"
					onclick={() => (showAll = !showAll)}
					class="ml-auto text-sm text-white/60 underline-offset-4 transition hover:text-white hover:underline"
				>
					{showAll
						? m.settings_streaming_less()
						: m.settings_streaming_more({ count: providers.length })}
				</button>
			{/if}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">{m.settings_streaming_unavailable()}</p>
	{/if}
</form>
