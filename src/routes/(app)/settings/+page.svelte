<script lang="ts">
	import { withFeedback } from '$lib/feedback/submit';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileJsonIcon from '@lucide/svelte/icons/file-json';
	import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
	import AvatarField from '$lib/components/social/AvatarField.svelte';
	import StreamingServicesField from '$lib/components/social/StreamingServicesField.svelte';
	import { countryName } from '$lib/format';
	import { LOCALE_NAMES, locales, REGIONS } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let savingProfile = $state(false);
	const field =
		'w-full rounded-2xl border border-white/10 bg-background px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-neon-cyan';

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
		<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">@{data.account.username}</p>
		<h1
			class="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-none font-bold tracking-[-0.04em]"
		>
			{m.settings_kicker()}
		</h1>
	</header>

	<!-- Perfil público (§6.6) -->
	<form
		method="POST"
		action="?/profile"
		use:enhance={withFeedback(
			() => {
				savingProfile = true;
				return async ({ update }) => {
					await update({ reset: false });
					savingProfile = false;
				};
			},
			{ success: m.settings_profile_saved() }
		)}
		class={card}
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class={label}>{m.settings_profile()}</h2>
				<p class="mt-1 text-sm text-muted-foreground">{m.settings_profile_hint()}</p>
			</div>
			<a
				href={resolve('/(app)/u/[username]', { username: data.account.username })}
				class="shrink-0 text-xs text-white/55 hover:text-white">{m.settings_view_profile()}</a
			>
		</div>
		<AvatarField user={data.account} />
		<label class="flex flex-col gap-2">
			<span class="text-xs text-white/60">{m.settings_name()}</span>
			<input name="name" maxlength="60" value={data.account.name ?? ''} class={field} />
			{#if form?.errors?.name}<span class="text-xs text-destructive">{form.errors.name[0]}</span
				>{/if}
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-xs text-white/60">{m.settings_bio()}</span>
			<textarea
				name="bio"
				rows="3"
				maxlength="300"
				placeholder={m.settings_bio_placeholder()}
				class="{field} resize-none">{data.account.bio ?? ''}</textarea
			>
			{#if form?.errors?.bio}<span class="text-xs text-destructive">{form.errors.bio[0]}</span>{/if}
		</label>
		<label class="flex cursor-pointer items-start gap-3">
			<input
				type="checkbox"
				name="isPrivate"
				checked={data.account.isPrivate}
				class="mt-0.5 size-4 shrink-0 accent-[var(--neon-pink)]"
			/>
			<span>
				<span class="block text-sm font-medium">{m.settings_private()}</span>
				<span class="mt-0.5 block text-xs text-muted-foreground">{m.settings_private_hint()}</span>
			</span>
		</label>
		<div class="flex items-center gap-4">
			<button
				disabled={savingProfile}
				class="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-background transition hover:bg-white/85 disabled:opacity-60"
			>
				{m.settings_save_profile()}
			</button>
			<a
				href={resolve('/reset-password')}
				class="text-sm text-white/60 underline-offset-4 transition hover:text-white hover:underline"
				>{m.settings_change_password()}</a
			>
		</div>
	</form>

	<!-- Streamings que a pessoa assina (§6.12) -->
	<StreamingServicesField
		providers={data.streaming.providers}
		selected={data.streaming.selected}
		region={data.region}
		class={card}
	/>

	<!-- Importar do Letterboxd ou de um backup (§6.7, §6.9) -->
	<a
		href={resolve('/settings/import')}
		class="{card} flex-row items-center justify-between transition hover:border-white/25"
	>
		<span>
			<span class="block {label}">{m.settings_import()}</span>
			<span class="mt-1 block text-sm text-muted-foreground">{m.settings_import_hint()}</span>
		</span>
		<ArrowRightIcon class="size-5 shrink-0 text-white/60" aria-hidden="true" />
	</a>

	<!-- Exportar (§6.9): downloads diretos, sem página -->
	<section class={card} aria-labelledby="export-title">
		<div>
			<h2 id="export-title" class={label}>{m.settings_export()}</h2>
			<p class="mt-1 text-sm text-muted-foreground">{m.settings_export_hint()}</p>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each [{ format: 'json', title: m.settings_export_json(), hint: m.settings_export_json_hint(), icon: FileJsonIcon }, { format: 'csv', title: m.settings_export_csv(), hint: m.settings_export_csv_hint(), icon: FileSpreadsheetIcon }] as item (item.format)}
				<a
					href={resolve('/(app)/settings/export/[format]', { format: item.format })}
					download
					data-sveltekit-reload
					class="flex flex-col gap-2 rounded-2xl border border-white/10 p-4 transition hover:border-white/30"
				>
					<span class="flex items-center gap-2 text-sm font-medium">
						<item.icon class="size-4 shrink-0" aria-hidden="true" />
						{item.title}
						<DownloadIcon class="ml-auto size-4 text-white/50" aria-hidden="true" />
					</span>
					<span class="text-xs text-white/55">{item.hint}</span>
				</a>
			{/each}
		</div>
	</section>

	<h2 class="mt-4 font-display text-2xl font-semibold tracking-[-0.02em]">{m.settings_title()}</h2>

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
