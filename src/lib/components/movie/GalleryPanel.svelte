<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { backdropUrl } from '$lib/tmdb/images';
	import type { MovieImage, MovieImages } from '$lib/tmdb/types';
	import type { Artwork, ArtworkKind } from '$lib/movie/types';

	/**
	 * Galeria com pôsteres e fundos de todos os idiomas. Logado, escolher uma imagem a salva
	 * como o "DNA" do filme (vale no dashboard, na busca e nas listas); sem login, os fundos
	 * só mudam o fundo desta página.
	 */
	let {
		movieId,
		signedIn,
		artwork,
		defaults,
		preview,
		onpreview,
		submit
	}: {
		movieId: number;
		signedIn: boolean;
		artwork: Artwork | null;
		/** Imagens padrão do TMDb. */
		defaults: Artwork;
		/** Fundo mostrado na página (prévia sem login). */
		preview: string | null;
		onpreview: (path: string) => void;
		submit: SubmitFunction;
	} = $props();

	let images = $state<MovieImages | null>(null);
	let failed = $state(false);
	let kind = $state<ArtworkKind>('backdrop');
	let language = $state<string>('all');
	let pending = $state<string | null>(null);

	$effect(() => {
		const controller = new AbortController();
		fetch(`/api/movie/${movieId}/images`, { signal: controller.signal })
			.then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
			.then((data: MovieImages) => (images = data))
			.catch(() => {
				if (!controller.signal.aborted) failed = true;
			});
		return () => controller.abort();
	});

	const list = $derived(images ? (kind === 'poster' ? images.posters : images.backdrops) : []);
	const field = $derived(kind === 'poster' ? 'posterPath' : 'backdropPath');
	const current = $derived(
		signedIn ? (artwork?.[field] ?? defaults[field]) : kind === 'backdrop' ? preview : null
	);
	const customized = $derived(Boolean(artwork?.[field]));

	/** Idiomas presentes, do mais comum ao menos comum ("none" = sem texto). */
	const languages = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const image of list) {
			const key = image.language ?? 'none';
			counts[key] = (counts[key] ?? 0) + 1;
		}
		return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
	});
	const visible = $derived(
		language === 'all' ? list : list.filter((image) => (image.language ?? 'none') === language)
	);

	const languageLabel = (key: string) => (key === 'none' ? 'Sem texto' : key.toUpperCase());
	const src = (image: MovieImage) =>
		kind === 'poster'
			? `https://image.tmdb.org/t/p/w342${image.path}`
			: backdropUrl(image.path, 'w780');

	const submitArtwork: SubmitFunction = (input) => {
		pending = (input.formData.get('path') as string) || null;
		const done = submit(input);
		return async (options) => {
			await (
				await done
			)?.(options);
			pending = null;
		};
	};

	const chip = 'shrink-0 rounded-full px-3 py-1 text-xs transition';
</script>

<div class="flex h-full min-h-0 flex-col gap-4">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
		<div class="flex gap-1 rounded-full border border-white/10 bg-background/60 p-1">
			{#each [['backdrop', 'Fundos'], ['poster', 'Pôsteres']] as const as [value, label] (value)}
				<button
					type="button"
					aria-pressed={kind === value}
					onclick={() => {
						kind = value;
						language = 'all';
					}}
					class={[
						'rounded-full px-4 py-1.5 text-xs font-medium tracking-[0.15em] uppercase transition',
						kind === value ? 'bg-white text-background' : 'text-white/70 hover:text-white'
					]}>{label}</button
				>
			{/each}
		</div>

		{#if languages.length > 1}
			<div class="flex min-w-0 gap-1 overflow-x-auto" aria-label="Filtrar por idioma">
				{#each ['all', ...languages] as key (key)}
					<button
						type="button"
						aria-pressed={language === key}
						onclick={() => (language = key)}
						class={[
							chip,
							language === key ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
						]}>{key === 'all' ? 'Todos' : languageLabel(key)}</button
					>
				{/each}
			</div>
		{/if}

		{#if signedIn && customized}
			<form method="POST" action="/movie/{movieId}?/artwork" use:enhance={submitArtwork}>
				<input type="hidden" name="kind" value={kind} />
				<button
					name="path"
					value=""
					class="text-xs text-white/50 underline-offset-4 transition hover:text-white hover:underline"
				>
					Restaurar padrão
				</button>
			</form>
		{/if}
	</div>

	{#if !signedIn}
		<p class="text-xs text-white/50">Entre para personalizar o pôster e o fundo deste filme.</p>
	{/if}

	<div class="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
		{#if failed}
			<p class="text-white/50">Não foi possível carregar as imagens.</p>
		{:else if !images}
			<ul
				class={[
					'grid gap-3',
					kind === 'poster'
						? 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6'
						: 'grid-cols-2 xl:grid-cols-3'
				]}
				aria-hidden="true"
			>
				{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
					<li
						class={[
							'animate-pulse rounded-xl bg-white/5',
							kind === 'poster' ? 'aspect-2/3' : 'aspect-video'
						]}
					></li>
				{/each}
			</ul>
		{:else if !visible.length}
			<p class="text-white/50">Sem imagens disponíveis.</p>
		{:else}
			<form method="POST" action="/movie/{movieId}?/artwork" use:enhance={submitArtwork}>
				<input type="hidden" name="kind" value={kind} />
				<ul
					class={[
						'grid gap-3',
						kind === 'poster'
							? 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6'
							: 'grid-cols-2 xl:grid-cols-3'
					]}
				>
					{#each visible as image (image.path)}
						{@const selected = (pending ?? current) === image.path}
						<li class="relative">
							<button
								type={signedIn ? 'submit' : 'button'}
								name={signedIn ? 'path' : undefined}
								value={signedIn ? image.path : undefined}
								disabled={!signedIn && kind === 'poster'}
								onclick={() => !signedIn && onpreview(image.path)}
								aria-pressed={selected}
								aria-label={kind === 'poster'
									? `Usar este pôster (${languageLabel(image.language ?? 'none')})`
									: `Usar este fundo (${languageLabel(image.language ?? 'none')})`}
								class={[
									'block w-full overflow-hidden rounded-xl bg-white/5 ring-1 transition',
									kind === 'poster' ? 'aspect-2/3' : 'aspect-video',
									selected
										? 'ring-2 ring-neon-pink'
										: 'ring-white/10 enabled:hover:ring-neon-pink/70'
								]}
							>
								<img
									src={src(image)}
									alt=""
									loading="lazy"
									decoding="async"
									class="size-full object-cover"
								/>
							</button>
							{#if selected}
								<span
									class="pointer-events-none absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-neon-pink text-background"
									><CheckIcon class="size-3.5" strokeWidth={3} aria-hidden="true" /></span
								>
							{/if}
							{#if image.language}
								<span
									class="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white/80"
									>{image.language.toUpperCase()}</span
								>
							{/if}
						</li>
					{/each}
				</ul>
			</form>
		{/if}
	</div>
</div>
