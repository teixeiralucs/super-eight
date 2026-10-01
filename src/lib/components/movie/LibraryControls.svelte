<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import NotebookPenIcon from '@lucide/svelte/icons/notebook-pen';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { MovieUserData } from '$lib/movie/types';
	import DiaryPopover from './DiaryPopover.svelte';
	import StarRating from './StarRating.svelte';

	/**
	 * Ações do usuário com o filme. Regra de negócio (§3.4.4): nota e favorito só depois de
	 * marcado como assistido — a UI desabilita e explica; o servidor e o banco garantem.
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

	// Um único botão mostra o estado atual; clicar troca para o outro.
	const nextStatus = $derived(library?.status === 'WANT_TO_WATCH' ? 'WATCHED' : 'WANT_TO_WATCH');
	const statusHint = $derived(
		!library
			? 'Adicionar à biblioteca como “Quero ver”'
			: watched
				? 'Mudar para “Quero ver” (remove nota e favorito)'
				: 'Marcar como assistido'
	);

	const submitStatus: SubmitFunction = (input) => {
		const losesData = watched && (library?.rating || library?.isFavorite);
		if (losesData && !confirm('Mudar para “Quero ver” remove sua nota e o favorito. Continuar?')) {
			input.cancel();
			return;
		}
		return submit(input);
	};
</script>

<div class="space-y-6">
	<!-- Estado atual + favorito -->
	<div class="flex items-center gap-3">
		<form method="POST" action="{base}?/status" use:enhance={submitStatus} class="flex-1">
			<button
				name="status"
				value={nextStatus}
				title={statusHint}
				aria-label="{library
					? watched
						? 'Assistido'
						: 'Quero ver'
					: 'Fora da biblioteca'}. {statusHint}"
				class={[
					'group flex w-full items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium transition',
					library
						? 'bg-white text-background hover:bg-white/85'
						: 'border border-white/20 text-white/85 hover:border-white/50'
				]}
			>
				{#if !library}
					<PlusIcon class="size-4" aria-hidden="true" /> Quero ver
				{:else if watched}
					<EyeIcon class="size-4" aria-hidden="true" /> Assistido
				{:else}
					<BookmarkIcon class="size-4 fill-current" aria-hidden="true" /> Quero ver
				{/if}
				{#if library}
					<ArrowLeftRightIcon
						class="ml-auto size-3.5 opacity-40 transition group-hover:opacity-80"
						aria-hidden="true"
					/>
				{/if}
			</button>
		</form>

		<form method="POST" action="{base}?/favorite" use:enhance={submit}>
			<button
				disabled={!watched}
				aria-pressed={library?.isFavorite ?? false}
				aria-label={library?.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
				class="grid size-10 place-items-center rounded-full border border-white/15 transition enabled:hover:border-neon-pink disabled:cursor-not-allowed disabled:opacity-40"
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

	<!-- Nota: 5 estrelas, meia estrela = 1 ponto (1–10) -->
	<div>
		<div class="mb-2 flex items-baseline justify-between text-xs">
			<span class="tracking-wider text-white/50 uppercase">Sua nota</span>
			{#if library?.rating}
				<span class="text-white/80 tabular-nums">{library.rating}/10</span>
			{/if}
		</div>
		<form method="POST" action="{base}?/rate" use:enhance={submit}>
			<StarRating value={library?.rating ?? null} disabled={!watched} />
		</form>
		{#if !watched}
			<p class="mt-2 text-xs text-white/45">Marque como assistido para avaliar e favoritar.</p>
		{/if}
	</div>

	<button
		bind:this={diaryButton}
		type="button"
		onclick={() => (diaryOpen = !diaryOpen)}
		aria-expanded={diaryOpen}
		aria-haspopup="dialog"
		class="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
	>
		<NotebookPenIcon class="size-4" aria-hidden="true" /> Registrar sessão
		{#if userData.sessions.length}
			<span class="rounded-full bg-black/15 px-2 py-0.5 text-xs tabular-nums"
				>{userData.sessions.length}</span
			>
		{/if}
	</button>

	{#if library}
		<form method="POST" action="{base}?/remove" use:enhance={submit} class="text-center">
			<button
				class="text-xs text-white/40 underline-offset-4 transition hover:text-white/80 hover:underline"
			>
				Remover da biblioteca
			</button>
		</form>
	{/if}
</div>

{#if diaryOpen && diaryButton}
	<DiaryPopover
		{movieId}
		sessions={userData.sessions}
		{submit}
		anchor={diaryButton}
		onClose={() => (diaryOpen = false)}
	/>
{/if}
