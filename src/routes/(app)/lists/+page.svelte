<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import LibraryBigIcon from '@lucide/svelte/icons/library-big';
	import ListVideoIcon from '@lucide/svelte/icons/list-video';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Modal from '$lib/components/Modal.svelte';
	import CollectionCard from '$lib/components/lists/CollectionCard.svelte';
	import ListCard from '$lib/components/lists/ListCard.svelte';
	import ListForm from '$lib/components/lists/ListForm.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { ActionData, PageData } from './$types';

	/**
	 * Duas divisões (earlySetup.md §6.1.7, §6.8): **Listas**, criadas e editadas pelo usuário,
	 * e **Coleções**, sagas do TMDb e listas oficiais do Trakt montadas a partir da biblioteca
	 * (só leitura).
	 */
	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tab = $derived.by(() => {
		const value = page.url.searchParams.get('tab');
		return value === 'collections' || value === 'liked' ? value : 'lists';
	});

	// ── Coleções: filtro por origem ──
	let source = $state<'all' | 'tmdb' | 'trakt'>('all');
	// Ocultas pelo usuário ficam numa seção à parte, no fim.
	const visible = $derived(data.collections.filter((c) => !c.hidden));
	const hiddenCollections = $derived(data.collections.filter((c) => c.hidden));
	const sourceCounts = $derived({
		all: visible.length,
		tmdb: visible.filter((c) => c.source === 'tmdb').length,
		trakt: visible.filter((c) => c.source === 'trakt').length
	});
	const shownCollections = $derived(
		source === 'all' ? visible : visible.filter((c) => c.source === source)
	);
	const sourceLabel = {
		all: m.collections_filter_all,
		tmdb: m.collections_filter_tmdb,
		trakt: m.collections_filter_trakt
	};

	// ── Busca das listas oficiais do Trakt em lotes (limite de chamadas do Trakt) ──
	let pending = $derived(data.traktPending);
	let waiting = $state<number | null>(null);
	let syncing = false;

	async function syncTrakt(stopped: () => boolean) {
		if (syncing) return;
		syncing = true;
		while (!stopped() && pending) {
			const response = await fetch('?/syncTrakt', {
				method: 'POST',
				body: new FormData(),
				headers: { 'x-sveltekit-action': 'true' }
			}).catch(() => null);
			const result = response ? deserialize(await response.text()) : null;
			if (result?.type !== 'success' || !result.data) break;
			const { remaining, retryAfter } = result.data as {
				remaining: number;
				retryAfter: number | null;
			};
			const progressed = remaining < pending;
			pending = remaining;
			// Novas coleções podem ter aparecido.
			if (progressed) await invalidateAll();
			if (retryAfter && remaining) {
				for (waiting = retryAfter; waiting > 0 && !stopped(); waiting--) {
					await new Promise((done) => setTimeout(done, 1000));
				}
				waiting = null;
			}
		}
		syncing = false;
	}

	// Só depende da aba: `untrack` evita que o próprio progresso (`pending`) reinicie a busca.
	$effect(() => {
		if (tab !== 'collections') return;
		let stopped = false;
		untrack(() => syncTrakt(() => stopped));
		return () => {
			stopped = true;
		};
	});

	// Reabre o formulário se a criação voltou com erro de validação.
	let creating = $derived(Boolean(form?.errors));

	const tabs = $derived([
		{
			id: 'lists',
			label: m.lists_tab_lists(),
			count: data.lists.length,
			href: resolve('/(app)/lists')
		},
		{
			id: 'liked',
			label: m.lists_tab_liked(),
			count: data.liked.length,
			href: `${resolve('/(app)/lists')}?tab=liked`
		},
		{
			id: 'collections',
			label: m.lists_tab_collections(),
			count: visible.length,
			href: `${resolve('/(app)/lists')}?tab=collections`
		}
	]);
</script>

<svelte:head>
	<title>{m.lists_page_title()}</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="flex flex-wrap items-end justify-between gap-4 pb-2">
		<div>
			<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">{m.nav_lists()}</p>
			<h1
				class="mt-3 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-bold tracking-[-0.04em]"
			>
				{m.lists_heading()}<span class="font-serif font-normal tracking-normal text-white/40 italic"
					>.</span
				>
			</h1>
		</div>
		{#if tab === 'lists' && data.lists.length}
			<button
				type="button"
				onclick={() => (creating = true)}
				class="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
			>
				<PlusIcon class="size-4" aria-hidden="true" />
				{m.lists_new()}
			</button>
		{/if}
	</header>

	<!-- Divisões (links: a aba fica na URL e o voltar do navegador funciona) -->
	<nav aria-label={m.lists_tabs_label()} class="self-start">
		<ul class="flex gap-1 self-start rounded-full border border-white/10 bg-background/60 p-1">
			{#each tabs as item (item.id)}
				<li>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- href vem de resolve('/(app)/lists') -->
					<a
						href={item.href}
						data-sveltekit-noscroll
						data-sveltekit-replacestate
						aria-current={tab === item.id ? 'page' : undefined}
						class={[
							'inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-medium tracking-[0.15em] uppercase transition',
							tab === item.id ? 'bg-white text-background' : 'text-white/70 hover:text-white'
						]}
					>
						{item.label}
						<span class="tabular-nums opacity-60">{item.count}</span>
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</li>
			{/each}
		</ul>
	</nav>

	{#if tab === 'lists'}
		{#if data.lists.length}
			<ul class="grid gap-6 md:grid-cols-2">
				{#each data.lists as list (list.id)}
					<li><ListCard {list} /></li>
				{/each}
			</ul>
		{:else}
			<section
				class="flex flex-col items-center gap-4 rounded-3xl border border-white/10 px-6 py-20 text-center"
			>
				<ListVideoIcon class="size-8 text-neon-purple" aria-hidden="true" />
				<h2 class="font-display text-2xl font-semibold">{m.lists_empty_title()}</h2>
				<p class="max-w-md text-sm text-muted-foreground">{m.lists_empty_text()}</p>
				<button
					type="button"
					onclick={() => (creating = true)}
					class="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
				>
					<PlusIcon class="size-4" aria-hidden="true" />
					{m.lists_new()}
				</button>
			</section>
		{/if}
	{:else if tab === 'liked'}
		<!-- Listas públicas de outras pessoas que você curtiu -->
		{#if data.liked.length}
			<ul class="grid gap-6 md:grid-cols-2">
				{#each data.liked as list (list.id)}
					<li><ListCard {list} /></li>
				{/each}
			</ul>
		{:else}
			<section
				class="flex flex-col items-center gap-4 rounded-3xl border border-white/10 px-6 py-20 text-center"
			>
				<HeartIcon class="size-8 text-neon-pink" aria-hidden="true" />
				<h2 class="font-display text-2xl font-semibold">{m.lists_liked_empty_title()}</h2>
				<p class="max-w-md text-sm text-muted-foreground">{m.lists_liked_empty_text()}</p>
			</section>
		{/if}
	{:else}
		<p class="max-w-2xl text-sm text-muted-foreground">{m.collections_intro()}</p>
		{#if pending}
			<p role="status" class="flex items-center gap-2 text-xs text-white/60">
				<LoaderCircleIcon class="size-3.5 animate-spin" aria-hidden="true" />
				{waiting
					? m.collections_trakt_waiting({ seconds: waiting, count: pending })
					: m.collections_trakt_syncing({ count: pending })}
			</p>
		{/if}
		{#if sourceCounts.tmdb && sourceCounts.trakt}
			<div class="flex gap-1" role="group" aria-label={m.collections_filter_label()}>
				{#each ['all', 'tmdb', 'trakt'] as const as value (value)}
					<button
						type="button"
						aria-pressed={source === value}
						onclick={() => (source = value)}
						class={[
							'rounded-full px-4 py-1.5 text-xs transition',
							source === value ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
						]}
					>
						{sourceLabel[value]()}
						<span class="ml-1 tabular-nums opacity-60">{sourceCounts[value]}</span>
					</button>
				{/each}
			</div>
		{/if}
		{#if visible.length}
			<ul class="grid gap-6 md:grid-cols-2">
				{#each shownCollections as collection (`${collection.source}:${collection.id}`)}
					<li><CollectionCard {collection} /></li>
				{/each}
			</ul>
		{:else if !hiddenCollections.length}
			<section
				class="flex flex-col items-center gap-4 rounded-3xl border border-white/10 px-6 py-20 text-center"
			>
				<LibraryBigIcon class="size-8 text-neon-cyan" aria-hidden="true" />
				<h2 class="font-display text-2xl font-semibold">{m.collections_empty_title()}</h2>
				<p class="max-w-md text-sm text-muted-foreground">{m.collections_empty_text()}</p>
			</section>
		{/if}

		{#if hiddenCollections.length}
			<details class="group mt-4 border-t border-white/10 pt-6">
				<summary
					class="flex cursor-pointer list-none items-center gap-2 text-sm text-white/60 transition hover:text-white"
				>
					<ChevronRightIcon class="size-4 transition group-open:rotate-90" aria-hidden="true" />
					{m.collections_hidden_title({ count: hiddenCollections.length })}
				</summary>
				<p class="mt-2 text-xs text-muted-foreground">{m.collections_hidden_hint()}</p>
				<ul class="mt-5 grid gap-6 opacity-70 md:grid-cols-2">
					{#each hiddenCollections as collection (`${collection.source}:${collection.id}`)}
						<li><CollectionCard {collection} /></li>
					{/each}
				</ul>
			</details>
		{/if}
	{/if}
</main>

{#if creating}
	<Modal title={m.lists_new()} onClose={() => (creating = false)}>
		<ListForm
			action="?/create"
			values={form?.values && {
				title: String(form.values.title ?? ''),
				description: String(form.values.description ?? ''),
				kind: form.values.kind === 'RANKED' ? 'RANKED' : 'COLLECTION',
				isPublic: form.values.isPublic === 'true'
			}}
			errors={form?.errors}
			submitLabel={m.list_create()}
			successMessage={m.toast_list_created()}
			onCancel={() => (creating = false)}
		/>
	</Modal>
{/if}
