<script lang="ts">
	import { page } from '$app/state';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { countryName } from '$lib/format';
	import { LOCALE_NAMES, locales, REGIONS } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Países no idioma atual, em ordem alfabética.
	const regions = $derived(
		REGIONS.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
			a.name.localeCompare(b.name, data.locale)
		)
	);

	const saved = $derived(Boolean(data.saved.locale || data.saved.region));
	const card = 'rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 flex flex-col gap-5';
	const label = 'font-display text-lg font-semibold';
</script>

<svelte:head>
	<title>{m.settings_page_title()}</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="pb-2">
		<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">{m.settings_kicker()}</p>
		<h1
			class="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-none font-bold tracking-[-0.04em]"
		>
			{m.settings_title()}
		</h1>
	</header>

	<!-- Formulário comum (sem enhance): o recarregamento aplica o idioma em tudo. -->
	<form method="POST" action="/preferences" class="flex flex-col gap-6">
		<input type="hidden" name="redirectTo" value={page.url.pathname} />

		<fieldset class={card}>
			<legend class="sr-only">{m.settings_language()}</legend>
			<div>
				<p class={label} aria-hidden="true">{m.settings_language()}</p>
				<p class="mt-1 text-sm text-muted-foreground">{m.settings_language_hint()}</p>
			</div>
			<div class="grid gap-2 sm:grid-cols-3">
				{#each locales as locale (locale)}
					<label
						class="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 px-4 py-3 transition hover:border-white/30 has-[:checked]:border-white has-[:checked]:bg-white has-[:checked]:text-background"
					>
						<input
							type="radio"
							name="locale"
							value={locale}
							checked={data.locale === locale}
							class="sr-only"
						/>
						<span lang={locale} class="font-medium">{LOCALE_NAMES[locale]}</span>
						<CheckIcon
							class="size-4 opacity-0 transition group-has-[:checked]:opacity-100"
							aria-hidden="true"
						/>
					</label>
				{/each}
			</div>
		</fieldset>

		<div class={card}>
			<div>
				<label for="region" class={label}>{m.settings_region()}</label>
				<p class="mt-1 text-sm text-muted-foreground">{m.settings_region_hint()}</p>
			</div>
			<select
				id="region"
				name="region"
				class="rounded-2xl border border-white/10 bg-background px-4 py-3 text-sm outline-none focus-visible:border-neon-cyan"
			>
				{#each regions as region (region.code)}
					<option value={region.code} selected={data.region === region.code}>
						{region.name}
					</option>
				{/each}
			</select>
		</div>

		<div class={card}>
			<p class={label}>{m.settings_titles()}</p>
			<p class="-mt-3 text-sm text-muted-foreground">{m.settings_titles_text()}</p>
		</div>

		<div class="flex flex-wrap items-center gap-4">
			<button
				class="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
			>
				{m.settings_save()}
			</button>
			<p class="text-xs text-muted-foreground">
				{saved ? m.settings_saved_on_profile() : m.settings_auto()}
			</p>
		</div>
	</form>
</main>
