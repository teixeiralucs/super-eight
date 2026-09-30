<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import { formatLongDate } from '$lib/format';
	import type { DiarySessionRow } from '$lib/movie/types';

	let {
		movieId,
		sessions,
		submit,
		dateInput = $bindable()
	}: {
		movieId: number;
		sessions: DiarySessionRow[];
		submit: SubmitFunction;
		dateInput?: HTMLInputElement;
	} = $props();

	/** Hoje no fuso do navegador (YYYY-MM-DD) — é o dia que a pessoa "vive". */
	const today = () => {
		const now = new Date();
		return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
	};

	const field =
		'w-full border-b border-white/15 bg-transparent py-2 text-sm outline-none transition-colors focus:border-neon-cyan';
</script>

<div class="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<form
		method="POST"
		action="/movie/{movieId}?/logSession"
		use:enhance={submit}
		class="space-y-5"
		aria-label="Registrar sessão"
	>
		<div class="grid grid-cols-2 gap-4">
			<label class="block">
				<span class="text-xs text-white/60">Quando assistiu</span>
				<input
					bind:this={dateInput}
					type="date"
					name="watchedAt"
					value={today()}
					max={today()}
					required
					class="{field} [color-scheme:dark]"
				/>
			</label>
			<label class="block">
				<span class="text-xs text-white/60">Nota (opcional)</span>
				<select name="rating" class="{field} bg-background">
					<option value="">—</option>
					{#each Array.from({ length: 10 }, (_, i) => 10 - i) as value (value)}
						<option {value}>{value}</option>
					{/each}
				</select>
			</label>
		</div>
		<label class="block">
			<span class="text-xs text-white/60">Anotação (opcional)</span>
			<textarea
				name="note"
				rows="2"
				maxlength="500"
				placeholder="Com quem, onde, o que achou…"
				class="{field} resize-none placeholder:text-white/30"></textarea>
		</label>
		<button
			class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
		>
			Registrar sessão
		</button>
	</form>

	<div>
		<p class="mb-3 text-xs tracking-wider text-white/50 uppercase">
			{sessions.length
				? `${sessions.length} ${sessions.length === 1 ? 'sessão' : 'sessões'}`
				: 'Nenhuma sessão ainda'}
		</p>
		<ol class="max-h-64 space-y-1 overflow-y-auto pr-1">
			{#each sessions as session (session.id)}
				<li class="group flex items-start gap-3 rounded-xl p-2 transition hover:bg-white/5">
					<div class="min-w-0 flex-1">
						<p class="flex flex-wrap items-center gap-x-2 text-sm">
							{formatLongDate(session.watchedAt)}
							{#if session.isRewatch}
								<span class="inline-flex items-center gap-1 text-xs text-white/50"
									><RotateCcwIcon class="size-3" aria-hidden="true" /> revisto</span
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
							aria-label="Apagar sessão de {formatLongDate(session.watchedAt)}"
						>
							<Trash2Icon class="size-3.5" />
						</button>
					</form>
				</li>
			{/each}
		</ol>
	</div>
</div>
