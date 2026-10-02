<script lang="ts">
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { fade, fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import StarIcon from '@lucide/svelte/icons/star';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';
	import MovieMetaLine from '$lib/components/MovieMetaLine.svelte';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import { daysBetween, movieHistory } from '$lib/diary/group';
	import type { DiaryLogEntry } from '$lib/diary/types';
	import { formatLongDate, formatShortDate, formatWeekday, movieMeta, yearOf } from '$lib/format';
	import { openMovie } from '$lib/movie/open.svelte';
	import { backdropUrl, posterUrl } from '$lib/tmdb/images';

	/**
	 * Painel lateral de um registro do diário: a sessão (data, nota, anotação), o histórico
	 * do usuário com o filme e um atalho para os detalhes do filme.
	 */
	let {
		entry,
		entries,
		onselect,
		ondeleted,
		onClose
	}: {
		entry: DiaryLogEntry;
		/** Diário completo (para o histórico do filme). */
		entries: DiaryLogEntry[];
		onselect: (entry: DiaryLogEntry) => void;
		ondeleted: (entry: DiaryLogEntry) => void;
		onClose: () => void;
	} = $props();

	const movie = $derived(entry.movie);
	const meta = $derived(movieMeta(movie));
	const history = $derived(movieHistory(entries, movie.id));
	const position = $derived(history.findIndex((item) => item.entry.id === entry.id));
	const previous = $derived(position > 0 ? history[position - 1].entry : null);
	const first = $derived(history[0]?.entry ?? entry);
	const last = $derived(history.at(-1)?.entry ?? entry);

	let panel: HTMLElement | undefined = $state();
	let deleting = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		panel?.focus();
	});

	// Ao trocar de registro, limpa erros e volta ao topo.
	$effect(() => {
		void entry.id;
		error = null;
		panel?.scrollTo({ top: 0 });
	});

	const gap = (from: Date, to: Date) => {
		const days = daysBetween(from, to);
		if (days === 0) return m.gap_same_day();
		if (days < 60) return plural(days, m.gap_days_one, m.gap_days_other);
		const months = Math.round(days / 30.4);
		if (months < 24) return m.gap_months({ count: months });
		return m.gap_years({ count: Math.round(days / 365) });
	};

	const ordinal = (n: number) => m.diary_nth_time({ n });
	const label = 'text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase';
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onClose()} />

<!-- Fundo: clique fecha -->
<div
	class="fixed inset-0 z-50 bg-background/60"
	transition:fade={{ duration: 200 }}
	onclick={onClose}
	aria-hidden="true"
></div>

<div
	bind:this={panel}
	role="dialog"
	aria-modal="true"
	aria-label={m.diary_entry({ title: movie.originalTitle, date: formatLongDate(entry.watchedAt) })}
	tabindex="-1"
	class="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-white/10 bg-background outline-none sm:w-[440px]"
	transition:fly={{ x: prefersReducedMotion.current ? 0 : 48, duration: 280, opacity: 0 }}
>
	<!-- Capa: fundo do filme (DNA do usuário) + título -->
	<header class="relative isolate shrink-0">
		<div class="absolute inset-0 -z-10 overflow-hidden">
			{#if movie.backdropPath}
				<img
					src={backdropUrl(movie.backdropPath, 'w780')}
					alt=""
					decoding="async"
					class="size-full object-cover opacity-60"
				/>
			{/if}
			<div
				class="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent"
			></div>
		</div>

		<button
			type="button"
			onclick={onClose}
			class="absolute top-4 right-4 grid size-9 place-items-center rounded-full border border-white/15 bg-background/70 transition hover:border-white/40"
			aria-label={m.diary_close_entry()}
		>
			<XIcon class="size-4" />
		</button>

		<div class="flex items-end gap-4 px-6 pt-24 pb-5">
			{#if movie.posterPath}
				<img
					src={posterUrl(movie.posterPath, 'w185')}
					alt=""
					class="w-20 shrink-0 rounded-lg ring-1 ring-white/15"
				/>
			{/if}
			<div class="min-w-0 flex-1">
				<h2 class="font-display text-2xl leading-tight font-bold tracking-[-0.02em] text-balance">
					{movie.originalTitle}
				</h2>
				{#if movie.title !== movie.originalTitle}
					<p class="mt-0.5 text-sm text-white/65">{movie.title}</p>
				{/if}
				<p class="mt-1 text-sm text-white/60 tabular-nums">{yearOf(movie.releaseDate) ?? '—'}</p>
				<MovieMetaLine {meta} class="mt-0.5 text-xs text-white/55" directorClass="text-white/75" />
			</div>
		</div>
	</header>

	<div class="flex flex-1 flex-col gap-8 px-6 pt-2 pb-6">
		<!-- Esta sessão -->
		<section aria-labelledby="sessao-title">
			<h3 id="sessao-title" class={label}>{m.diary_this_session()}</h3>
			<p class="mt-3 font-display text-3xl leading-none font-bold tracking-[-0.03em]">
				{formatLongDate(entry.watchedAt)}
			</p>
			<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
				<span class="first-letter:uppercase">{formatWeekday(entry.watchedAt)}</span>
				<span aria-hidden="true" class="text-white/25">·</span>
				<span class="inline-flex items-center gap-1">
					{#if entry.isRewatch}<RotateCcwIcon class="size-3.5" aria-hidden="true" />{/if}
					{ordinal(position + 1)}{#if history.length > 1}<span class="text-white/35"
							>&nbsp;{m.diary_of_total({ total: history.length })}</span
						>{/if}
				</span>
				{#if previous}
					<span aria-hidden="true" class="text-white/25">·</span>
					<span>{gap(previous.watchedAt, entry.watchedAt)}</span>
				{/if}
			</p>

			<div class="mt-5 flex items-center gap-3">
				{#if entry.rating}
					<span class="flex" aria-hidden="true">
						{#each Array.from({ length: 10 }, (_, i) => i + 1) as star (star)}
							<StarIcon
								class={[
									'size-4',
									star <= (entry.rating ?? 0) ? 'fill-neon-peach text-neon-peach' : 'text-white/20'
								]}
								strokeWidth={1.5}
							/>
						{/each}
					</span>
					<span class="text-sm tabular-nums"
						>{entry.rating}<span class="text-white/40">/10</span></span
					>
				{:else}
					<span class="text-sm text-white/45">{m.diary_no_rating()}</span>
				{/if}
			</div>

			{#if entry.note}
				<blockquote
					class="mt-5 border-l-2 border-neon-pink/70 pl-4 font-serif text-lg leading-snug text-white/85 italic"
				>
					{entry.note}
				</blockquote>
			{:else}
				<p class="mt-5 text-sm text-white/40">{m.diary_no_note()}</p>
			{/if}
		</section>

		<!-- Você e o filme -->
		<section aria-labelledby="historico-title">
			<h3 id="historico-title" class={label}>{m.diary_you_and_movie()}</h3>
			<dl
				class="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10"
			>
				<div class="bg-background p-4">
					<dt class="text-xs text-white/50">{m.diary_watched()}</dt>
					<dd class="mt-1 text-lg font-semibold tabular-nums">
						{history.length}×
						<span class="text-sm font-normal text-white/50">{m.diary_in_diary()}</span>
					</dd>
				</div>
				<div class="bg-background p-4">
					<dt class="text-xs text-white/50">{m.diary_current_rating()}</dt>
					<dd class="mt-1 flex items-center gap-2 text-lg font-semibold">
						{#if entry.library?.rating}<RatingBadge rating={entry.library.rating} />{:else}<span
								class="text-white/40">—</span
							>{/if}
						{#if entry.library?.isFavorite}
							<HeartIcon
								class="size-4 fill-neon-pink text-neon-pink"
								aria-label={m.status_favorite()}
							/>
						{/if}
					</dd>
				</div>
				<div class="bg-background p-4">
					<dt class="text-xs text-white/50">{m.diary_first_time()}</dt>
					<dd class="mt-1 text-sm">{formatLongDate(first.watchedAt)}</dd>
				</div>
				<div class="bg-background p-4">
					<dt class="text-xs text-white/50">{m.diary_last_time()}</dt>
					<dd class="mt-1 text-sm">{formatLongDate(last.watchedAt)}</dd>
				</div>
			</dl>
		</section>

		<!-- Todas as datas -->
		{#if history.length > 1}
			<section aria-labelledby="datas-title">
				<h3 id="datas-title" class={label}>{m.diary_all_sessions()}</h3>
				<ol class="mt-3 space-y-1">
					{#each history.toReversed() as item (item.entry.id)}
						{@const current = item.entry.id === entry.id}
						<li>
							<button
								type="button"
								onclick={() => onselect(item.entry)}
								aria-current={current ? 'true' : undefined}
								class={[
									'flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition',
									current ? 'bg-white/10' : 'hover:bg-white/5'
								]}
							>
								<span
									class={[
										'mt-1.5 size-2 shrink-0 rounded-full',
										current ? 'bg-neon-pink' : 'bg-white/25'
									]}
									aria-hidden="true"
								></span>
								<span class="min-w-0 flex-1">
									<span class="flex items-baseline justify-between gap-2 text-sm">
										<span
											>{formatShortDate(item.entry.watchedAt)}
											{item.entry.watchedAt.getUTCFullYear()}</span
										>
										<span class="text-xs text-white/45">{ordinal(item.nth)}</span>
									</span>
									{#if item.entry.note}
										<span class="mt-0.5 block truncate text-xs text-white/55"
											>{item.entry.note}</span
										>
									{/if}
								</span>
								{#if item.entry.rating}<RatingBadge
										rating={item.entry.rating}
										class="text-xs"
									/>{/if}
							</button>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<!-- Ações -->
		<div class="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-5">
			<form
				method="POST"
				action="/movie/{movie.id}?/deleteSession"
				use:enhance={({ cancel }) => {
					if (!confirm(m.diary_confirm_delete({ date: formatLongDate(entry.watchedAt) })))
						return cancel();
					deleting = true;
					error = null;
					const removed = entry;
					return async ({ result, update }) => {
						deleting = false;
						if (result.type === 'success') {
							await update({ reset: false });
							ondeleted(removed);
						} else {
							error = m.diary_delete_error();
						}
					};
				}}
			>
				<input type="hidden" name="sessionId" value={entry.id} />
				<button
					disabled={deleting}
					class="inline-flex items-center gap-1.5 text-xs text-white/45 transition hover:text-destructive disabled:opacity-50"
				>
					<Trash2Icon class="size-3.5" aria-hidden="true" />
					{m.diary_delete()}
				</button>
			</form>

			<a
				href={resolve('/movie/[id]', { id: String(movie.id) })}
				onclick={(event) => {
					onClose();
					openMovie(event, movie.id);
				}}
				class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
			>
				{m.diary_see_movie()}
				<ArrowUpRightIcon class="size-4" aria-hidden="true" />
			</a>
		</div>
		{#if error}<p role="alert" class="-mt-4 text-right text-xs text-destructive">{error}</p>{/if}
	</div>
</div>
