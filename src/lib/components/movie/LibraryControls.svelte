<script lang="ts">
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import NotebookPenIcon from '@lucide/svelte/icons/notebook-pen';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { MovieUserData } from '$lib/movie/types';
	import DiaryPopover from './DiaryPopover.svelte';
	import ListsPopover from './ListsPopover.svelte';
	import ListVideoIcon from '@lucide/svelte/icons/list-video';
	import StarRating from './StarRating.svelte';

	/**
	 * Ações do usuário com o filme. O estado não é escolhido à mão: vem do diário
	 * (§3.4.3) — com sessão registrada é "Assistido", sem nenhuma é "Quero ver".
	 * Nota e favorito só para assistidos (§3.4.4): a UI desabilita; servidor e banco garantem.
	 */
	let {
		movieId,
		userData,
		submit
	}: {
		movieId: number;
		userData: MovieUserData;
		/** Fábrica do `use:enhance` (atualiza o estado a partir da resposta da action). */
		submit: SubmitFunction;
	} = $props();

	const library = $derived(userData.library);
	const watched = $derived(library?.status === 'WATCHED');
	const base = $derived(`/movie/${movieId}`);

	let diaryOpen = $state(false);
	let diaryButton: HTMLButtonElement | undefined = $state();
	let listsOpen = $state(false);
	let listsButton: HTMLButtonElement | undefined = $state();
	const inLists = $derived(userData.lists.filter((list) => list.contains).length);
</script>

<div class="space-y-6">
	<!-- Estado (definido pelo diário) -->
	{#if library}
		<p
			class={[
				'flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium',
				watched ? 'bg-white text-background' : 'border border-white/20 text-white/85'
			]}
		>
			{#if watched}
				<EyeIcon class="size-4" aria-hidden="true" /> {m.status_watched()}
			{:else}
				<BookmarkIcon class="size-4 fill-current" aria-hidden="true" /> {m.status_watchlist()}
			{/if}
		</p>
	{:else}
		<form method="POST" action="{base}?/add" use:enhance={submit}>
			<button
				class="flex w-full items-center gap-2.5 rounded-full border border-dashed border-white/25 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/60 hover:text-white"
			>
				<PlusIcon class="size-4" aria-hidden="true" />
				{m.add_to_watchlist()}
			</button>
		</form>
	{/if}

	<!-- Nota (10 estrelas, 1–10) + favorito -->
	<div>
		<div class="mb-2 flex items-baseline justify-between text-xs">
			<span class="tracking-wider text-white/50 uppercase">{m.your_rating()}</span>
			{#if library?.rating}
				<span class="text-white/80 tabular-nums">{library.rating}/10</span>
			{/if}
		</div>
		<div class="flex items-center justify-between gap-3">
			<form method="POST" action="{base}?/rate" use:enhance={submit}>
				<StarRating value={library?.rating ?? null} disabled={!watched} />
			</form>
			<form method="POST" action="{base}?/favorite" use:enhance={submit}>
				<button
					disabled={!watched}
					aria-pressed={library?.isFavorite ?? false}
					aria-label={library?.isFavorite ? m.favorite_remove() : m.favorite_add()}
					class="grid size-9 place-items-center rounded-full border border-white/15 transition enabled:hover:border-neon-pink disabled:cursor-not-allowed disabled:opacity-40"
				>
					<HeartIcon
						class={[
							'size-4',
							library?.isFavorite ? 'fill-neon-pink text-neon-pink' : 'text-white/70'
						]}
					/>
				</button>
			</form>
		</div>
		{#if !watched}
			<p class="mt-2 text-xs text-white/45">{m.rate_needs_session()}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<button
			bind:this={diaryButton}
			type="button"
			onclick={() => {
				listsOpen = false;
				diaryOpen = !diaryOpen;
			}}
			aria-expanded={diaryOpen}
			aria-haspopup="dialog"
			class="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
		>
			<NotebookPenIcon class="size-4" aria-hidden="true" />
			{m.log_session()}
			{#if userData.sessions.length}
				<span class="rounded-full bg-black/15 px-2 py-0.5 text-xs tabular-nums"
					>{userData.sessions.length}</span
				>
			{/if}
		</button>
		<button
			bind:this={listsButton}
			type="button"
			onclick={() => {
				diaryOpen = false;
				listsOpen = !listsOpen;
			}}
			aria-expanded={listsOpen}
			aria-haspopup="dialog"
			class="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/85 transition hover:border-white/40"
		>
			<ListVideoIcon class="size-4" aria-hidden="true" />
			{inLists ? plural(inLists, m.lists_in_count_one, m.lists_in_count_other) : m.lists_button()}
		</button>
	</div>

	{#if library}
		<form method="POST" action="{base}?/remove" use:enhance={submit} class="text-center">
			<button
				class="text-xs text-white/40 underline-offset-4 transition hover:text-white/80 hover:underline"
			>
				{m.remove_from_library()}
			</button>
		</form>
	{/if}
</div>

{#if listsOpen && listsButton}
	<ListsPopover
		{movieId}
		lists={userData.lists}
		{submit}
		anchor={listsButton}
		onClose={() => (listsOpen = false)}
	/>
{/if}

{#if diaryOpen && diaryButton}
	<DiaryPopover
		{movieId}
		sessions={userData.sessions}
		{submit}
		anchor={diaryButton}
		onClose={() => (diaryOpen = false)}
	/>
{/if}
