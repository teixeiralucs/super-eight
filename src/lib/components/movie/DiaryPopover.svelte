<script lang="ts">
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import AnchoredPopover from '$lib/components/AnchoredPopover.svelte';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import { formatLongDate, todayIso } from '$lib/format';
	import type { DiarySessionRow } from '$lib/movie/types';
	import DateField from './DateField.svelte';
	import StarRating from './StarRating.svelte';

	/** Diário do filme num pop-up ao lado do botão "Registrar sessão" (ver AnchoredPopover). */
	let {
		movieId,
		sessions,
		submit,
		anchor,
		onClose
	}: {
		movieId: number;
		sessions: DiarySessionRow[];
		submit: SubmitFunction;
		anchor: HTMLElement;
		onClose: () => void;
	} = $props();

	let watchedAt = $state(todayIso());
	let rating = $state<number | null>(null);
	let saved = $state(false);

	/** Usa o tratamento comum (estado/erros) e, se deu certo, limpa o formulário. */
	const submitSession: SubmitFunction = async (input) => {
		saved = false;
		const done = await submit(input);
		return async (options) => {
			await done?.(options);
			if (options.result.type === 'success') {
				input.formElement.reset();
				watchedAt = todayIso();
				rating = null;
				saved = true;
			}
		};
	};

	const field =
		'w-full border-b border-white/15 bg-transparent py-2 text-sm outline-none transition-colors focus:border-neon-cyan';
</script>

<AnchoredPopover
	{anchor}
	label={m.diary_movie()}
	heading={m.diary()}
	closeLabel={m.close_diary()}
	{onClose}
>
	<form
		method="POST"
		action="/movie/{movieId}?/logSession"
		use:enhance={submitSession}
		class="space-y-5 px-6 pt-3 pb-6"
		aria-label={m.log_session()}
	>
		<DateField name="watchedAt" label={m.when_watched()} bind:value={watchedAt} />

		<div>
			<span class="text-xs text-white/60">{m.rating_optional()}</span>
			<div class="mt-2 flex items-center gap-3">
				<StarRating
					value={rating}
					mode="pick"
					label={m.session_rating()}
					onpick={(value) => (rating = value)}
				/>
				{#if rating}<span class="text-xs text-white/70 tabular-nums">{rating}/10</span>{/if}
			</div>
			<input type="hidden" name="rating" value={rating ?? ''} />
		</div>

		<label class="block">
			<span class="text-xs text-white/60">{m.note_optional()}</span>
			<textarea
				name="note"
				rows="2"
				maxlength="500"
				placeholder={m.note_placeholder()}
				class="{field} resize-none placeholder:text-white/30"></textarea>
		</label>

		<div class="flex items-center gap-4">
			<button
				class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
			>
				{m.log_session()}
			</button>
			{#if saved}<p role="status" class="text-xs text-neon-cyan">{m.session_logged()}</p>{/if}
		</div>
	</form>

	<div class="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-4 py-4">
		<p class="mb-2 px-2 text-xs tracking-wider text-white/50 uppercase">
			{sessions.length
				? plural(sessions.length, m.sessions_count_one, m.sessions_count_other)
				: m.no_sessions_yet()}
		</p>
		<ol class="space-y-1">
			{#each sessions as session (session.id)}
				<li class="group flex items-start gap-3 rounded-xl p-2 transition hover:bg-white/5">
					<div class="min-w-0 flex-1">
						<p class="flex flex-wrap items-center gap-x-2 text-sm">
							{formatLongDate(session.watchedAt)}
							{#if session.isRewatch}
								<span class="inline-flex items-center gap-1 text-xs text-white/50"
									><RotateCcwIcon class="size-3" aria-hidden="true" /> {m.rewatched()}</span
								>
							{/if}
						</p>
						{#if session.note}
							<p class="mt-0.5 text-xs text-white/60">{session.note}</p>
						{/if}
					</div>
					{#if session.rating}<RatingBadge rating={session.rating} class="text-xs" />{/if}
					<form method="POST" action="/movie/{movieId}?/deleteSession" use:enhance={submit}>
						<input type="hidden" name="sessionId" value={session.id} />
						<button
							class="grid size-7 place-items-center rounded-full text-white/40 opacity-0 transition group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
							aria-label={m.delete_session_of({ date: formatLongDate(session.watchedAt) })}
						>
							<Trash2Icon class="size-3.5" />
						</button>
					</form>
				</li>
			{/each}
		</ol>
	</div>
</AnchoredPopover>
