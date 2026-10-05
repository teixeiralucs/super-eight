<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { deserialize } from '$app/forms';
	import { resolve } from '$app/paths';
	import { unzipSync } from 'fflate';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import FileArchiveIcon from '@lucide/svelte/icons/file-archive';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { backupToImport, isBackup } from '$lib/import/backup';
	import { parseLetterboxd } from '$lib/import/letterboxd';
	import type { ImportFilm, ImportStats, LetterboxdExport } from '$lib/import/types';
	import { FILMS_BATCH, LIST_CHUNK, RESOLVE_BATCH } from '$lib/schemas/import';

	/**
	 * Importador (earlySetup.md §6.7, §6.9): o .zip do Letterboxd ou o backup .json do Super
	 * Eight, lido no navegador; mostra o resumo e envia em lotes (encontrar no TMDb — o backup
	 * já traz os IDs → biblioteca/diário/reviews → listas → coleções ocultas).
	 */
	type Phase =
		| { name: 'idle'; error?: string }
		| { name: 'reading' }
		| { name: 'ready'; data: LetterboxdExport; source: 'letterboxd' | 'backup' }
		| { name: 'running'; step: 'resolve' | 'films' | 'lists'; done: number; total: number }
		| {
				name: 'done';
				stats: ImportStats;
				unmatched: ImportFilm[];
				failedBatches: number;
		  };

	let phase = $state<Phase>({ name: 'idle' });
	let dragging = $state(false);
	let input: HTMLInputElement | undefined = $state();

	// ─── Leitura do .zip ─────────────────────────────────────────────
	async function read(file: File | undefined) {
		if (!file) return;
		phase = { name: 'reading' };
		try {
			// Backup do Super Eight (.json).
			if (file.name.toLowerCase().endsWith('.json')) {
				const json: unknown = JSON.parse(await file.text());
				phase = isBackup(json)
					? { name: 'ready', data: backupToImport(json), source: 'backup' }
					: { name: 'idle', error: m.import_error_backup() };
				return;
			}
			const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
				filter: (entry) => entry.name.toLowerCase().endsWith('.csv')
			});
			const decoder = new TextDecoder();
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local, não reativo
			const files = new Map<string, string>();
			for (const [name, bytes] of Object.entries(entries)) {
				files.set(name.replace(/\\/g, '/'), decoder.decode(bytes));
			}
			// Zip recompactado dentro de uma pasta: tira o primeiro nível.
			if (![...files.keys()].some((path) => !path.includes('/'))) {
				for (const [path, text] of [...files]) {
					files.delete(path);
					files.set(path.slice(path.indexOf('/') + 1), text);
				}
			}
			const data = parseLetterboxd(files);
			phase = data.films.length
				? { name: 'ready', data, source: 'letterboxd' }
				: { name: 'idle', error: m.import_error_empty() };
		} catch (err) {
			console.error('[import] leitura:', err);
			phase = { name: 'idle', error: m.import_error_file() };
		}
	}

	const summary = $derived.by(() => {
		if (phase.name !== 'ready') return [];
		const { films, lists } = phase.data;
		const count = (test: (film: ImportFilm) => boolean) => films.filter(test).length;
		return [
			{ label: m.import_count_films(), value: count((f) => f.sessions.length > 0) },
			{
				label: m.import_count_sessions(),
				value: films.reduce((sum, f) => sum + f.sessions.length, 0)
			},
			{ label: m.import_count_ratings(), value: count((f) => f.rating !== null) },
			{ label: m.import_count_watchlist(), value: count((f) => f.watchlist && !f.sessions.length) },
			{
				label: phase.source === 'backup' ? m.collection_view_favorites() : m.import_count_likes(),
				value: count((f) => f.liked && f.sessions.length > 0)
			},
			{ label: m.import_count_reviews(), value: count((f) => f.review !== null) },
			{ label: m.import_count_lists(), value: lists.length }
		];
	});

	// ─── Envio em lotes ──────────────────────────────────────────────
	const chunks = <T,>(items: T[], size: number) =>
		Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
			items.slice(i * size, (i + 1) * size)
		);

	/** Chama uma action da página com o lote em JSON; uma nova tentativa se falhar. */
	async function call<T>(action: string, payload: unknown): Promise<T | null> {
		const body = new FormData();
		body.set('payload', JSON.stringify(payload));
		for (let attempt = 0; attempt < 2; attempt++) {
			try {
				const response = await fetch(`?/${action}`, {
					method: 'POST',
					body,
					headers: { 'x-sveltekit-action': 'true' }
				});
				const result = deserialize(await response.text());
				if (result.type === 'success') return result.data as T;
			} catch (err) {
				console.error(`[import] ${action}:`, err);
			}
		}
		return null;
	}

	const advance = (count: number) => {
		if (phase.name === 'running') phase = { ...phase, done: phase.done + count };
	};

	async function run(data: LetterboxdExport) {
		const stats: ImportStats = {
			films: 0,
			sessions: 0,
			watchlist: 0,
			favorites: 0,
			reviews: 0,
			lists: 0
		};
		let failedBatches = 0;

		// 1. Nome + ano → ID do TMDb (o backup já traz os IDs).
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local, não reativo
		const ids = new Map<string, number>();
		for (const film of data.films) if (film.tmdbId) ids.set(film.key, film.tmdbId);
		const unresolved = data.films.filter((film) => !film.tmdbId);
		const resolveBatches = chunks(unresolved, RESOLVE_BATCH);
		phase = { name: 'running', step: 'resolve', done: 0, total: unresolved.length };
		for (const batch of resolveBatches) {
			const result = await call<{ matches: { key: string; tmdbId: number | null }[] }>('resolve', {
				films: batch.map(({ key, name, year }) => ({ key, name, year }))
			});
			if (!result) failedBatches++;
			for (const match of result?.matches ?? []) {
				if (match.tmdbId) ids.set(match.key, match.tmdbId);
			}
			advance(batch.length);
		}

		// 2. Biblioteca, diário, notas, favoritos e reviews.
		const resolved = data.films.filter((film) => ids.has(film.key));
		phase = { name: 'running', step: 'films', done: 0, total: resolved.length };
		for (const batch of chunks(resolved, FILMS_BATCH)) {
			const result = await call<{ stats: ImportStats }>('films', {
				films: batch.map((film) => ({
					tmdbId: ids.get(film.key)!,
					sessions: film.sessions,
					rating: film.rating,
					liked: film.liked,
					watchlist: film.watchlist,
					review: film.review,
					artwork: film.artwork ?? null
				}))
			});
			if (!result) failedBatches++;
			for (const key of Object.keys(stats) as (keyof ImportStats)[]) {
				stats[key] += result?.stats[key] ?? 0;
			}
			advance(batch.length);
		}

		// 3. Listas (as grandes em partes; a mesma lista é reaproveitada).
		phase = { name: 'running', step: 'lists', done: 0, total: data.lists.length };
		for (const list of data.lists) {
			const movieIds = list.films.flatMap((key) => ids.get(key) ?? []);
			let ok = true;
			for (const part of movieIds.length ? chunks(movieIds, LIST_CHUNK) : [[]]) {
				const result = await call('list', {
					title: list.title,
					description: list.description,
					kind: list.kind,
					isPublic: list.isPublic,
					movieIds: part
				});
				if (!result) {
					failedBatches++;
					ok = false;
				}
			}
			if (ok) stats.lists++;
			advance(1);
		}

		// 4. Coleções ocultas (backup).
		if (data.hiddenCollections?.length) {
			const result = await call('hidden', { collections: data.hiddenCollections });
			if (!result) failedBatches++;
		}

		phase = {
			name: 'done',
			stats,
			unmatched: data.films.filter((film) => !ids.has(film.key)),
			failedBatches
		};
	}

	// Avisa antes de sair no meio da importação.
	$effect(() => {
		if (phase.name !== 'running') return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		addEventListener('beforeunload', warn);
		return () => removeEventListener('beforeunload', warn);
	});

	const stepLabel = {
		resolve: m.import_step_resolve,
		films: m.import_step_films,
		lists: m.import_step_lists
	};
	const steps = ['resolve', 'films', 'lists'] as const;
	const card = 'rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8';
	const button =
		'rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110';
</script>

<svelte:head>
	<title>{m.import_page_title()}</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="pb-2">
		<a
			href={resolve('/settings')}
			class="inline-flex items-center gap-1.5 text-xs tracking-[0.3em] text-neon-cyan uppercase"
		>
			<ArrowLeftIcon class="size-3.5" aria-hidden="true" />
			{m.import_kicker()}
		</a>
		<h1
			class="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-none font-bold tracking-[-0.04em]"
		>
			{m.import_title()}
		</h1>
		<p class="mt-4 max-w-xl text-sm text-muted-foreground">{m.import_intro()}</p>
	</header>

	{#if phase.name === 'idle' || phase.name === 'reading'}
		<section class="{card} flex flex-col gap-6">
			<div>
				<h2 class="font-display text-lg font-semibold">{m.import_how_title()}</h2>
				<ol class="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-white/75">
					<li>{m.import_how_1()}</li>
					<li>{m.import_how_2()}</li>
					<li>{m.import_how_3()}</li>
				</ol>
				<p class="mt-3 text-sm text-white/60">{m.import_how_backup()}</p>
			</div>

			<!-- Área de soltar: clicar abre o seletor -->
			<button
				type="button"
				onclick={() => input?.click()}
				ondragover={(event) => {
					event.preventDefault();
					dragging = true;
				}}
				ondragleave={() => (dragging = false)}
				ondrop={(event) => {
					event.preventDefault();
					dragging = false;
					read(event.dataTransfer?.files[0]);
				}}
				disabled={phase.name === 'reading'}
				class={[
					'flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition',
					dragging ? 'border-neon-cyan bg-neon-cyan/5' : 'border-white/20 hover:border-white/40'
				]}
			>
				{#if phase.name === 'reading'}
					<LoaderCircleIcon class="size-7 animate-spin text-white/70" aria-hidden="true" />
					<span class="text-sm">{m.import_reading()}</span>
				{:else}
					<FileArchiveIcon class="size-7 text-white/70" aria-hidden="true" />
					<span
						class="rounded-full bg-white px-5 py-2 text-sm font-semibold text-background transition"
						>{m.import_pick()}</span
					>
					<span class="text-xs text-white/50">{m.import_drop()}</span>
				{/if}
			</button>
			<input
				bind:this={input}
				type="file"
				accept=".zip,.json,application/zip,application/json"
				class="hidden"
				onchange={(event) => read(event.currentTarget.files?.[0])}
			/>

			{#if phase.name === 'idle' && phase.error}
				<p role="alert" class="flex items-start gap-2.5 text-sm text-white/90">
					<CircleAlertIcon class="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
					{phase.error}
				</p>
			{/if}
		</section>
	{:else if phase.name === 'ready'}
		{@const data = phase.data}
		<section class="{card} flex flex-col gap-6">
			<h2 class="font-display text-lg font-semibold">{m.import_found()}</h2>
			<dl class="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
				{#each summary as item (item.label)}
					<div>
						<dt class="text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">
							{item.label}
						</dt>
						<dd class="mt-1 font-display text-2xl font-semibold tabular-nums">{item.value}</dd>
					</div>
				{/each}
			</dl>
		</section>

		<section class="{card} flex flex-col gap-3">
			<h2 class="font-display text-lg font-semibold">{m.import_rules_title()}</h2>
			<ul class="list-disc space-y-1.5 pl-5 text-sm text-white/75">
				{#if phase.source === 'backup'}
					<li>{m.import_rule_backup()}</li>
				{:else}
					<li>{m.import_rule_watched()}</li>
					<li>{m.import_rule_reviews()}</li>
					<li>{m.import_rule_lists()}</li>
				{/if}
				<li>{m.import_rule_safe()}</li>
			</ul>
		</section>

		<div class="flex flex-wrap items-center gap-4">
			<button type="button" onclick={() => run(data)} class={button}>{m.import_start()}</button>
			<button
				type="button"
				onclick={() => (phase = { name: 'idle' })}
				class="text-sm text-white/60 transition hover:text-white"
			>
				{m.import_other_file()}
			</button>
		</div>
	{:else if phase.name === 'running'}
		{@const current = steps.indexOf(phase.step)}
		<section class="{card} flex flex-col gap-6" aria-live="polite">
			<ol class="flex flex-col gap-4">
				{#each steps as step, i (step)}
					<li class={['flex items-center gap-3 text-sm', i > current && 'text-white/40']}>
						{#if i < current}
							<CircleCheckIcon class="size-5 text-neon-cyan" aria-hidden="true" />
						{:else if i === current}
							<LoaderCircleIcon class="size-5 animate-spin" aria-hidden="true" />
						{:else}
							<span class="grid size-5 place-items-center text-xs tabular-nums">{i + 1}</span>
						{/if}
						<span class="flex-1">{stepLabel[step]()}</span>
						{#if i === current}
							<span class="text-xs text-white/60 tabular-nums">
								{m.import_progress({ done: phase.done, total: phase.total })}
							</span>
						{/if}
					</li>
				{/each}
			</ol>
			<div
				class="h-1.5 overflow-hidden rounded-full bg-white/10"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={phase.total}
				aria-valuenow={phase.done}
			>
				<div
					class="h-full rounded-full bg-neon-cyan transition-[width] duration-300"
					style:width="{phase.total ? (phase.done / phase.total) * 100 : 100}%"
				></div>
			</div>
			<p class="text-xs text-white/50">{m.import_keep_open()}</p>
		</section>
	{:else if phase.name === 'done'}
		{@const stats = phase.stats}
		<section class="{card} flex flex-col gap-5">
			<h2 class="flex items-center gap-2.5 font-display text-lg font-semibold">
				<CircleCheckIcon class="size-5 text-neon-cyan" aria-hidden="true" />
				{m.import_done_title()}
			</h2>
			<ul class="grid gap-x-6 gap-y-2 text-sm text-white/80 sm:grid-cols-2">
				<li>{m.import_done_films({ count: stats.films })}</li>
				<li>{m.import_done_sessions({ count: stats.sessions })}</li>
				<li>{m.import_done_watchlist({ count: stats.watchlist })}</li>
				<li>{m.import_done_favorites({ count: stats.favorites })}</li>
				<li>{m.import_done_reviews({ count: stats.reviews })}</li>
				<li>{m.import_done_lists({ count: stats.lists })}</li>
			</ul>
			{#if phase.failedBatches}
				<p role="alert" class="flex items-start gap-2.5 text-sm text-white/90">
					<CircleAlertIcon class="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
					{m.import_failed_batches({ count: phase.failedBatches })}
				</p>
			{/if}
			<div>
				<a href={resolve('/dashboard')} class="{button} inline-block">{m.import_go_library()}</a>
			</div>
		</section>

		{#if phase.unmatched.length}
			<section class="{card} flex flex-col gap-3">
				<h2 class="font-display text-lg font-semibold">
					{m.import_unmatched_title({ count: phase.unmatched.length })}
				</h2>
				<p class="text-sm text-muted-foreground">{m.import_unmatched_hint()}</p>
				<ul class="divide-y divide-white/5 text-sm">
					{#each phase.unmatched as film (film.key)}
						<li class="flex items-center justify-between gap-4 py-2">
							<span class="min-w-0 truncate">
								{film.name}
								{#if film.year}<span class="text-white/50 tabular-nums">({film.year})</span>{/if}
							</span>
							<a
								href="{resolve('/(app)/search')}?q={encodeURIComponent(film.name)}"
								class="shrink-0 text-xs text-neon-cyan hover:underline">{m.import_search()}</a
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</main>
