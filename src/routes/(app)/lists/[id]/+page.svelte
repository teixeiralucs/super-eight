<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import CheckIcon from '@lucide/svelte/icons/check';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import LinkIcon from '@lucide/svelte/icons/link';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import LockIcon from '@lucide/svelte/icons/lock';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';
	import Modal from '$lib/components/Modal.svelte';
	import MoviePosterCard from '$lib/components/MoviePosterCard.svelte';
	import ListForm from '$lib/components/lists/ListForm.svelte';
	import { intlLocale, plural } from '$lib/i18n';
	import { posterFromCard } from '$lib/library/poster';
	import { COLLECTION_SORTS, type CollectionSort, type ListItem } from '$lib/lists/types';
	import { m } from '$lib/paraglide/messages';
	import { backdropSrcset, backdropUrl } from '$lib/tmdb/images';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const list = $derived(data.list);
	const ranked = $derived(list.kind === 'RANKED');

	// Ordem local (o ranking muda na hora ao arrastar; o servidor confirma em seguida).
	let items = $derived<ListItem[]>(data.list.items);
	let sort = $state<CollectionSort>('added');
	const sortLabel = (value: CollectionSort) =>
		({ added: m.list_sort_added, release: m.list_sort_release, title: m.list_sort_title })[value]();

	const shown = $derived.by(() => {
		if (ranked || sort === 'added') return items;
		const copy = [...items];
		if (sort === 'title') {
			return copy.sort((a, b) =>
				a.movie.originalTitle.localeCompare(b.movie.originalTitle, intlLocale())
			);
		}
		const time = (item: ListItem) => item.movie.releaseDate?.getTime() ?? Infinity;
		return copy.sort((a, b) => time(a) - time(b));
	});

	const cover = $derived(items.find((item) => item.movie.backdropPath)?.movie.backdropPath ?? null);

	let editing = $state(false);
	let editingFields = $state(false);
	let orderSaved = $state(false);
	let copied = $state(false);
	let reorderForm: HTMLFormElement | undefined = $state();
	let orderInput: HTMLInputElement | undefined = $state();

	// ── Reordenar (só rankings, só o dono) ──
	let dragIndex = $state<number | null>(null);

	function move(from: number, to: number) {
		if (to < 0 || to >= items.length || from === to) return;
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		items = next;
	}

	function saveOrder() {
		if (!orderInput || !reorderForm) return;
		orderInput.value = items.map((item) => item.movie.id).join(',');
		reorderForm.requestSubmit();
	}

	const submitOrder: SubmitFunction = () => {
		orderSaved = false;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				orderSaved = true;
				setTimeout(() => (orderSaved = false), 2000);
			} else {
				// Falhou: volta para a ordem do servidor.
				await update();
			}
		};
	};

	async function copyLink() {
		await navigator.clipboard.writeText(location.href);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	const pad = (n: number) => String(n).padStart(2, '0');
	const control =
		'grid size-8 place-items-center rounded-full border border-white/10 text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-30';
</script>

<svelte:head>
	<title>{list.title} — Super Eight</title>
	{#if list.description}<meta name="description" content={list.description} />{/if}
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-8 px-5 pt-6 pb-16 md:px-10">
	<!-- Destaque: fundo do 1º filme e o título grande -->
	<header
		class="relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 md:min-h-[420px] md:p-10"
	>
		{#if cover}
			<div
				class="absolute inset-0 -z-10 bg-cover bg-center"
				style:background-image="url({backdropUrl(cover, 'w300')})"
			>
				<img
					src={backdropUrl(cover, 'w1280')}
					srcset={backdropSrcset(cover)}
					sizes="(min-width: 1600px) 1520px, 100vw"
					alt=""
					decoding="async"
					class="size-full object-cover"
				/>
			</div>
		{:else}
			<div
				class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--neon-purple)_22%,transparent),transparent_65%)]"
			></div>
		{/if}
		<div
			class="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/60 to-background/10"
		></div>

		<p
			class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold tracking-[0.2em] uppercase"
		>
			<span class="inline-flex items-center gap-1.5 text-neon-cyan">
				{#if ranked}<ListOrderedIcon class="size-3.5" aria-hidden="true" />{/if}
				{ranked ? m.list_kind_ranked() : m.list_kind_collection()}
			</span>
			<span class="text-white/30" aria-hidden="true">·</span>
			<span class="inline-flex items-center gap-1.5 text-white/60">
				{#if list.isPublic}
					<GlobeIcon class="size-3.5" aria-hidden="true" />{m.list_public()}
				{:else}
					<LockIcon class="size-3.5" aria-hidden="true" />{m.list_private()}
				{/if}
			</span>
			{#if !list.isOwner}
				<span class="text-white/30" aria-hidden="true">·</span>
				<a
					href={resolve('/(app)/u/[username]', { username: list.owner.username })}
					class="tracking-normal text-white/60 normal-case hover:text-white hover:underline"
					>{m.list_by({ username: list.owner.username })}</a
				>
			{/if}
		</p>
		<div class="mt-3 flex items-end justify-between gap-6">
			<h1
				class="max-w-5xl font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.9] font-bold tracking-[-0.045em] text-balance"
			>
				{list.title}
			</h1>
			<span class="shrink-0 font-display text-4xl font-light text-white/80 tabular-nums md:text-6xl"
				>{items.length}</span
			>
		</div>
		{#if list.description}
			<p class="mt-4 max-w-2xl text-base leading-relaxed text-white/75">{list.description}</p>
		{/if}

		<div class="mt-6 flex flex-wrap items-center gap-2">
			{#if list.isOwner}
				{#if editing}
					<button
						type="button"
						onclick={() => (editingFields = true)}
						class="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm transition hover:border-white/50"
					>
						<PencilIcon class="size-4" aria-hidden="true" />
						{m.list_edit()}
					</button>
					<button
						type="button"
						onclick={() => (editing = false)}
						class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-background"
					>
						<CheckIcon class="size-4" aria-hidden="true" />
						{m.list_done()}
					</button>
				{:else}
					<button
						type="button"
						onclick={() => (editing = true)}
						class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-background/40 px-4 py-2 text-sm transition hover:border-white/50"
					>
						<PencilIcon class="size-4" aria-hidden="true" />
						{m.list_edit()}
					</button>
				{/if}
			{/if}
			{#if list.isPublic}
				<button
					type="button"
					onclick={copyLink}
					class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-background/40 px-4 py-2 text-sm transition hover:border-white/50"
				>
					<LinkIcon class="size-4" aria-hidden="true" />
					{copied ? m.list_link_copied() : m.list_copy_link()}
				</button>
			{/if}
		</div>
	</header>

	{#if form && 'message' in form && form.message}
		<p role="alert" class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if items.length}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<p class="text-sm text-muted-foreground">
				{plural(items.length, m.movies_count_one, m.movies_count_other)}
				{#if editing && ranked}<span class="ml-2 text-white/40">· {m.list_drag()}</span>{/if}
				{#if orderSaved}<span role="status" class="ml-2 text-neon-cyan">{m.list_order_saved()}</span
					>{/if}
			</p>
			{#if !ranked}
				<label class="flex items-center gap-2 text-sm">
					<span class="sr-only">{m.filter_sort_by()}</span>
					<select
						bind:value={sort}
						class="rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-white/80 outline-none focus-visible:border-neon-cyan"
					>
						{#each COLLECTION_SORTS as value (value)}
							<option {value}>{sortLabel(value)}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>

		<ul
			class="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6"
		>
			{#each shown as item, i (item.movie.id)}
				<li
					draggable={editing && ranked}
					ondragstart={(event) => {
						dragIndex = i;
						event.dataTransfer?.setData('text/plain', String(item.movie.id));
					}}
					ondragover={(event) => {
						if (dragIndex === null) return;
						event.preventDefault();
						if (dragIndex !== i) {
							move(dragIndex, i);
							dragIndex = i;
						}
					}}
					ondragend={() => {
						if (dragIndex !== null) saveOrder();
						dragIndex = null;
					}}
					class={[
						'transition-opacity',
						dragIndex === i && 'opacity-40',
						editing && ranked && 'cursor-grab'
					]}
				>
					{#if ranked}
						<p
							class="mb-2 font-display text-3xl leading-none font-bold tracking-[-0.03em] text-white/85 tabular-nums"
						>
							{pad(i + 1)}
						</p>
					{/if}
					<MoviePosterCard movie={posterFromCard(item.movie)} library={item.library} />

					{#if editing}
						<div class="mt-3 flex items-center gap-1.5">
							{#if ranked}
								<GripVerticalIcon class="size-4 text-white/40" aria-hidden="true" />
								<button
									type="button"
									class={control}
									disabled={i === 0}
									onclick={() => {
										move(i, i - 1);
										saveOrder();
									}}
									aria-label={m.list_move_up({ title: item.movie.originalTitle })}
								>
									<ArrowUpIcon class="size-3.5" />
								</button>
								<button
									type="button"
									class={control}
									disabled={i === items.length - 1}
									onclick={() => {
										move(i, i + 1);
										saveOrder();
									}}
									aria-label={m.list_move_down({ title: item.movie.originalTitle })}
								>
									<ArrowDownIcon class="size-3.5" />
								</button>
							{/if}
							<form method="POST" action="?/remove" use:enhance class="ml-auto">
								<input type="hidden" name="movieId" value={item.movie.id} />
								<button
									class="{control} hover:border-destructive hover:text-destructive"
									aria-label={m.list_remove_movie({ title: item.movie.originalTitle })}
								>
									<XIcon class="size-3.5" />
								</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>

		<form bind:this={reorderForm} method="POST" action="?/reorder" use:enhance={submitOrder} hidden>
			<input bind:this={orderInput} type="hidden" name="order" />
		</form>
	{:else}
		<section class="rounded-3xl border border-white/10 px-6 py-16 text-center">
			<p class="font-display text-xl font-semibold">{m.list_empty_items()}</p>
			{#if list.isOwner}
				<p class="mt-2 text-sm text-muted-foreground">{m.list_empty_items_hint()}</p>
			{/if}
		</section>
	{/if}
</main>

{#if editingFields}
	<Modal title={m.list_edit()} onClose={() => (editingFields = false)}>
		<ListForm
			action="?/update"
			values={list}
			errors={form && 'errors' in form
				? (form.errors as Record<string, string[] | undefined>)
				: undefined}
			submitLabel={m.list_save()}
			onCancel={() => (editingFields = false)}
			submit={() =>
				async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') editingFields = false;
				}}
		/>
		<form
			method="POST"
			action="?/delete"
			use:enhance={({ cancel }) => {
				if (!confirm(m.list_delete_confirm({ title: list.title }))) cancel();
			}}
			class="mt-6 border-t border-white/10 pt-5"
		>
			<button
				class="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-destructive"
			>
				<Trash2Icon class="size-4" aria-hidden="true" />
				{m.list_delete()}
			</button>
		</form>
	</Modal>
{/if}
