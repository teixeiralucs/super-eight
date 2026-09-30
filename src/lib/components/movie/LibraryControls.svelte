<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import NotebookPenIcon from '@lucide/svelte/icons/notebook-pen';
	import type { MovieUserData } from '$lib/movie/types';

	/**
	 * Ações do usuário com o filme. Regra de negócio (§3.4.4): nota e favorito só depois de
	 * marcado como assistido — a UI desabilita e explica; o servidor e o banco garantem.
	 */
	let {
		movieId,
		userData,
		submit,
		onLogSession
	}: {
		movieId: number;
		userData: MovieUserData;
		/** Fábrica do `use:enhance` (atualiza o estado a partir da resposta da action). */
		submit: SubmitFunction;
		onLogSession: () => void;
	} = $props();

	const library = $derived(userData.library);
	const watched = $derived(library?.status === 'WATCHED');
	const base = $derived(`/movie/${movieId}`);
	const segment =
		'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm transition';
</script>

<div class="space-y-6">
	<!-- Status -->
	<form
		method="POST"
		action="{base}?/status"
		use:enhance={submit}
		class="flex gap-1 rounded-full border border-white/10 bg-background/40 p-1"
	>
		<button
			name="status"
			value="WANT_TO_WATCH"
			aria-pressed={library?.status === 'WANT_TO_WATCH'}
			class={[
				segment,
				library?.status === 'WANT_TO_WATCH'
					? 'bg-white text-background'
					: 'text-white/70 hover:text-white'
			]}
		>
			<BookmarkIcon class="size-4" aria-hidden="true" /> Quero ver
		</button>
		<button
			name="status"
			value="WATCHED"
			aria-pressed={watched}
			class={[segment, watched ? 'bg-white text-background' : 'text-white/70 hover:text-white']}
		>
			<EyeIcon class="size-4" aria-hidden="true" /> Assistido
		</button>
	</form>

	<!-- Nota 1–10 + favorito -->
	<div>
		<div class="mb-2 flex items-baseline justify-between text-xs">
			<span class="tracking-wider text-white/50 uppercase">Sua nota</span>
			{#if library?.rating}
				<span class="text-white/80 tabular-nums">{library.rating}/10</span>
			{/if}
		</div>
		<div class="flex items-center gap-3">
			<form
				method="POST"
				action="{base}?/rate"
				use:enhance={submit}
				class="flex flex-1 gap-1"
				aria-label="Sua nota de 1 a 10"
			>
				{#each Array.from({ length: 10 }, (_, i) => i + 1) as value (value)}
					{@const active = (library?.rating ?? 0) >= value}
					<button
						name="rating"
						value={library?.rating === value ? '' : value}
						disabled={!watched}
						aria-label={library?.rating === value ? `Remover nota ${value}` : `Nota ${value}`}
						aria-pressed={library?.rating === value}
						class={[
							'h-7 flex-1 rounded-[4px] transition disabled:cursor-not-allowed',
							active ? 'bg-neon-peach' : 'bg-white/10 enabled:hover:bg-neon-peach/60'
						]}
					></button>
				{/each}
			</form>

			<form method="POST" action="{base}?/favorite" use:enhance={submit}>
				<button
					disabled={!watched}
					aria-pressed={library?.isFavorite ?? false}
					aria-label={library?.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
					class="grid size-9 place-items-center rounded-full border border-white/10 transition enabled:hover:border-neon-pink disabled:cursor-not-allowed disabled:opacity-40"
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
			<p class="mt-2 text-xs text-white/45">Marque como assistido para avaliar e favoritar.</p>
		{/if}
	</div>

	<button
		type="button"
		onclick={onLogSession}
		class="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
	>
		<NotebookPenIcon class="size-4" aria-hidden="true" /> Registrar sessão
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
