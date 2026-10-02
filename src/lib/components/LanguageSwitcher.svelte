<script lang="ts">
	import { page } from '$app/state';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import { currentLocale, LOCALE_NAMES, locales } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Troca de idioma para visitantes (rodapé, telas de login). Envia para /preferences, que
	 * grava o cookie e volta para esta página recarregada no idioma novo.
	 */
	let { class: className = '' }: { class?: string } = $props();

	const current = currentLocale();
</script>

<form method="POST" action="/preferences" class={['inline-flex', className]}>
	<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
	<label
		class="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition focus-within:border-neon-cyan hover:border-white/25"
	>
		<LanguagesIcon class="size-3.5" aria-hidden="true" />
		<span class="sr-only">{m.language_switcher()}</span>
		<select
			name="locale"
			onchange={(event) => event.currentTarget.form?.submit()}
			class="bg-transparent outline-none [&>option]:bg-background"
		>
			{#each locales as locale (locale)}
				<option value={locale} selected={locale === current} lang={locale}
					>{LOCALE_NAMES[locale]}</option
				>
			{/each}
		</select>
	</label>
	<noscript><button class="ml-2 text-xs underline">OK</button></noscript>
</form>
