<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import { formatLongDate, todayIso } from '$lib/format';
	import type { DiarySessionRow } from '$lib/movie/types';
	import DateField from './DateField.svelte';
	import StarRating from './StarRating.svelte';

	/**
	 * Diário do filme num pop-up ao lado do botão "Registrar sessão" (no celular, painel
	 * inferior). Fica por cima do painel de detalhes: Esc e clique fora fecham só ele.
	 */
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

	let panel: HTMLElement | undefined = $state();
	let position = $state<{ top: number; right: number } | null>(null);

	let watchedAt = $state(todayIso());
	let rating = $state<number | null>(null);
	let saved = $state(false);

	const GAP = 16;

	/** No desktop, encosta à esquerda do botão e centraliza na vertical sem sair da tela. */
	function place() {
		if (!panel || !matchMedia('(min-width: 1024px)').matches) {
			position = null;
			return;
		}
		const rect = anchor.getBoundingClientRect();
		const height = panel.offsetHeight;
		const centered = rect.top + rect.height / 2 - height / 2;
		position = {
			top: Math.min(Math.max(centered, GAP), window.innerHeight - height - GAP),
			right: window.innerWidth - rect.left + GAP
		};
	}

	$effect(() => {
		if (!panel) return;
		const observer = new ResizeObserver(place);
		observer.observe(panel);
		panel.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.focus();
		return () => observer.disconnect();
	});

	function onPointerDown(event: PointerEvent) {
		const target = event.target as Node;
		if (!panel?.contains(target) && !anchor.contains(target)) onClose();
	}

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

<svelte:window
	onresize={place}
	onpointerdown={onPointerDown}
	onkeydown={(event) => event.key === 'Escape' && onClose()}
/>

<!-- data-nested-dialog: o painel de detalhes por baixo ignora o Esc enquanto este estiver aberto -->
<div
	bind:this={panel}
	data-nested-dialog
	role="dialog"
	aria-label="Diário do filme"
	class={[
		'fixed z-[70] flex max-h-[min(640px,calc(100svh-2rem))] flex-col overflow-hidden border border-white/10 bg-background/95 shadow-2xl shadow-black/60',
		'inset-x-0 bottom-0 rounded-t-3xl lg:inset-x-auto lg:bottom-auto lg:w-[380px] lg:rounded-3xl',
		!position && 'lg:invisible'
	]}
	style:top={position ? `${position.top}px` : undefined}
	style:right={position ? `${position.right}px` : undefined}
	transition:fly={{ x: prefersReducedMotion.current ? 0 : 12, duration: 200 }}
>
	<header class="flex items-center justify-between px-6 pt-5">
		<h2 class="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">Diário</h2>
		<button
			type="button"
			onclick={onClose}
			class="-mr-2 grid size-8 place-items-center rounded-full text-white/60 transition hover:text-white"
			aria-label="Fechar diário"
		>
			<XIcon class="size-4" />
		</button>
	</header>

	<form
		method="POST"
		action="/movie/{movieId}?/logSession"
		use:enhance={submitSession}
		class="space-y-5 px-6 pt-3 pb-6"
		aria-label="Registrar sessão"
	>
		<DateField name="watchedAt" label="Quando assistiu" bind:value={watchedAt} />

		<div>
			<span class="text-xs text-white/60">Nota (opcional)</span>
			<div class="mt-2 flex items-center gap-3">
				<StarRating
					value={rating}
					mode="pick"
					size="sm"
					label="Nota da sessão"
					onpick={(value) => (rating = value)}
				/>
				{#if rating}<span class="text-xs text-white/70 tabular-nums">{rating}/10</span>{/if}
			</div>
			<input type="hidden" name="rating" value={rating ?? ''} />
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

		<div class="flex items-center gap-4">
			<button
				class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
			>
				Registrar sessão
			</button>
			{#if saved}<p role="status" class="text-xs text-neon-cyan">Sessão registrada.</p>{/if}
		</div>
	</form>

	<div class="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-4 py-4">
		<p class="mb-2 px-2 text-xs tracking-wider text-white/50 uppercase">
			{sessions.length
				? `${sessions.length} ${sessions.length === 1 ? 'sessão' : 'sessões'}`
				: 'Nenhuma sessão ainda'}
		</p>
		<ol class="space-y-1">
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
