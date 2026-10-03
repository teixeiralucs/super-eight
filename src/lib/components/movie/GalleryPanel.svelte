<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ZoomInIcon from '@lucide/svelte/icons/zoom-in';
	import ImageLightbox from './ImageLightbox.svelte';
	import MovieLogo from './MovieLogo.svelte';
	import { infiniteScroll } from '$lib/attachments/infinite-scroll';
	import { backdropUrl } from '$lib/tmdb/images';
	import type { MovieImage, MovieImages } from '$lib/tmdb/types';
	import { artworkField, type Artwork, type ArtworkKind } from '$lib/movie/types';

	/**
	 * Galeria com pôsteres, fundos e logos de todos os idiomas. Logado, escolher uma imagem a
	 * salva como o "DNA" do filme (pôster e fundo valem no dashboard, na busca e nas listas; a
	 * logo, no título); sem login, fundos e logos só mudam esta página.
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
		/** Fundo e logo mostrados na página (prévia sem login; o fundo também fica atrás das logos). */
		preview: Pick<Artwork, 'backdropPath' | 'logoPath'>;
		onpreview: (kind: Exclude<ArtworkKind, 'poster'>, path: string) => void;
		submit: SubmitFunction;
	} = $props();

	let images = $state<MovieImages | null>(null);
	let failed = $state(false);
	let kind = $state<ArtworkKind>('backdrop');
	let language = $state<string>('all');
	let pending = $state<string | null>(null);
	/** Posição (em `visible`) da imagem ampliada; nulo = visualizador fechado. */
	let zoomed = $state<number | null>(null);

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

	const list = $derived(
		images ? { poster: images.posters, backdrop: images.backdrops, logo: images.logos }[kind] : []
	);
	const field = $derived(artworkField(kind));
	const current = $derived(
		signedIn
			? (artwork?.[field] ?? defaults[field])
			: kind === 'poster'
				? null
				: preview[artworkField(kind)]
	);
	const customized = $derived(Boolean(artwork?.[field]));

	/** Idiomas presentes com a quantidade, do mais comum ao menos comum ("none" = sem texto). */
	const languages = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const image of list) {
			const key = image.language ?? 'none';
			counts[key] = (counts[key] ?? 0) + 1;
		}
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.map(([key, count]) => ({ key, count }));
	});
	const visible = $derived(
		language === 'all' ? list : list.filter((image) => (image.language ?? 'none') === language)
	);

	// Desenha aos poucos (há filmes com 400+ pôsteres); volta ao início ao trocar tipo/idioma.
	const PAGE = 48;
	let limit = $state(PAGE);
	$effect(() => {
		void kind;
		void language;
		limit = PAGE;
	});
	const shown = $derived(visible.slice(0, limit));
	let scroller: HTMLDivElement | undefined = $state();
	/** No desktop a galeria rola por dentro; no celular quem rola é a página. */
	const scrollRoot = () =>
		scroller && scroller.scrollHeight > scroller.clientHeight ? scroller : null;

	const languageLabel = (key: string) => (key === 'none' ? m.gallery_no_text() : key.toUpperCase());
	const src = (image: MovieImage) =>
		kind === 'poster'
			? `https://image.tmdb.org/t/p/w342${image.path}`
			: backdropUrl(image.path, 'w780');
	/** Logos aparecem sobre o fundo do filme, como no título. */
	const logoStage = $derived(
		preview.backdropPath ? backdropUrl(preview.backdropPath, 'w300') : null
	);

	const kinds = [
		['backdrop', m.gallery_backdrops],
		['poster', m.gallery_posters],
		['logo', m.gallery_logos]
	] as const;
	const grid = $derived(
		kind === 'poster' ? 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 xl:grid-cols-3'
	);
	const useLabel = (image: MovieImage) => {
		const language = languageLabel(image.language ?? 'none');
		return {
			poster: m.gallery_use_poster,
			backdrop: m.gallery_use_backdrop,
			logo: m.gallery_use_logo
		}[kind]({ language });
	};

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
			{#each kinds as [value, label] (value)}
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
					]}>{label()}</button
				>
			{/each}
		</div>

		{#if languages.length > 1}
			<div class="flex min-w-0 gap-1 overflow-x-auto" aria-label={m.gallery_filter_language()}>
				{#each [{ key: 'all', count: list.length }, ...languages] as { key, count } (key)}
					<button
						type="button"
						aria-pressed={language === key}
						onclick={() => (language = key)}
						class={[
							chip,
							language === key ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
						]}
						>{key === 'all' ? m.gallery_all() : languageLabel(key)}
						<span class="ml-1 tabular-nums opacity-50">{count}</span></button
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
					{m.gallery_restore()}
				</button>
			</form>
		{/if}
	</div>

	{#if !signedIn}
		<p class="text-xs text-white/50">{m.gallery_sign_in()}</p>
	{/if}

	<div bind:this={scroller} class="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
		{#if failed}
			<p class="text-white/50">{m.gallery_error()}</p>
		{:else if !images}
			<ul class={['grid gap-3', grid]} aria-hidden="true">
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
			<p class="text-white/50">{m.gallery_empty()}</p>
		{:else}
			<form method="POST" action="/movie/{movieId}?/artwork" use:enhance={submitArtwork}>
				<input type="hidden" name="kind" value={kind} />
				<ul class={['grid gap-3', grid]}>
					{#each shown as image, i (image.path)}
						{@const selected = (pending ?? current) === image.path}
						<li class="group relative">
							<button
								type={signedIn ? 'submit' : 'button'}
								name={signedIn ? 'path' : undefined}
								value={signedIn ? image.path : undefined}
								disabled={!signedIn && kind === 'poster'}
								onclick={() => !signedIn && kind !== 'poster' && onpreview(kind, image.path)}
								aria-pressed={selected}
								aria-label={useLabel(image)}
								class={[
									'block w-full overflow-hidden rounded-xl bg-white/5 ring-1 transition',
									kind === 'poster' ? 'aspect-2/3' : 'aspect-video',
									selected
										? 'ring-2 ring-neon-pink'
										: 'ring-white/10 enabled:hover:ring-neon-pink/70'
								]}
							>
								{#if kind === 'logo'}
									<span
										class="block size-full bg-cover bg-center shadow-[inset_0_0_0_100vmax_rgb(0_0_0/0.55)]"
										style:background-image={logoStage ? `url(${logoStage})` : undefined}
									>
										<MovieLogo
											path={image.path}
											loading="lazy"
											class="size-full object-contain p-[10%_12%]"
										/>
									</span>
								{:else}
									<img
										src={src(image)}
										alt=""
										loading="lazy"
										decoding="async"
										class="size-full object-cover"
									/>
								{/if}
							</button>
							<!-- Ampliar (não escolhe: só abre o visualizador) -->
							<button
								type="button"
								onclick={() => (zoomed = i)}
								aria-label={m.gallery_zoom()}
								class="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-background/80 text-white/85 transition hover:bg-white hover:text-background focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
							>
								<ZoomInIcon class="size-3.5" aria-hidden="true" />
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
			<!-- Sentinela: carrega o próximo lote ao chegar perto do fim da rolagem da galeria -->
			{#if limit < visible.length}
				{#key limit}
					<div
						{@attach infiniteScroll(() => (limit += PAGE), '600px', scrollRoot())}
						class="h-px"
					></div>
				{/key}
			{/if}
		{/if}
	</div>
</div>

{#if zoomed !== null && visible[zoomed]}
	<ImageLightbox
		images={visible}
		bind:index={zoomed}
		{kind}
		selectedPath={pending ?? current}
		{signedIn}
		{movieId}
		submit={submitArtwork}
		{languageLabel}
		stage={backdropUrl(preview.backdropPath, 'w1280')}
		{onpreview}
		onClose={() => (zoomed = null)}
	/>
{/if}
