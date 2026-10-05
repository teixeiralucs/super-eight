<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Página de erro (earlySetup.md §6.4.6). Erros esperados (404 de filme, lista, perfil…)
	 * mostram a mensagem do servidor; os inesperados (5xx) só um texto genérico — o detalhe
	 * fica no log, nunca na tela.
	 */
	let { home }: { home: '/' | '/dashboard' } = $props();

	const status = $derived(page.status);
	/** Mensagens padrão do SvelteKit (em inglês) não servem para a tela. */
	const DEFAULTS = ['Not Found', 'Internal Error', 'Unauthorized', 'Forbidden'];
	const custom = $derived(
		page.error?.message && !DEFAULTS.includes(page.error.message) && status < 500
			? page.error.message
			: null
	);
	const copy = $derived(
		status === 404
			? { title: m.error_page_404_title(), text: custom ?? m.error_page_404_text() }
			: status === 401 || status === 403
				? { title: m.error_page_403_title(), text: custom ?? m.error_page_403_text() }
				: status >= 500
					? { title: m.error_page_500_title(), text: m.error_page_500_text() }
					: { title: m.error_page_other_title(), text: custom ?? m.error_page_500_text() }
	);
</script>

<svelte:head>
	<title>{copy.title} — Super Eight</title>
</svelte:head>

<main
	class="mx-auto flex min-h-[70svh] max-w-2xl flex-col items-center justify-center gap-5 px-5 py-16 text-center"
>
	<p
		class="bg-linear-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text font-display text-[clamp(5rem,18vw,9rem)] leading-none font-bold tracking-[-0.06em] text-transparent tabular-nums"
		aria-hidden="true"
	>
		{status}
	</p>
	<h1 class="font-display text-3xl font-semibold tracking-[-0.03em]">{copy.title}</h1>
	<p class="max-w-md text-sm leading-relaxed text-muted-foreground">{copy.text}</p>
	<div class="mt-3 flex flex-wrap items-center justify-center gap-3">
		<button
			type="button"
			onclick={() => history.back()}
			class="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm transition hover:border-white/50"
		>
			<ArrowLeftIcon class="size-4" aria-hidden="true" />
			{m.back()}
		</button>
		{#if status >= 500}
			<button
				type="button"
				onclick={() => location.reload()}
				class="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm transition hover:border-white/50"
			>
				<RotateCwIcon class="size-4" aria-hidden="true" />
				{m.error_page_retry()}
			</button>
		{/if}
		<a
			href={resolve(home)}
			class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
			>{home === '/' ? m.back_to_home() : m.error_page_go_library()}</a
		>
	</div>
</main>
