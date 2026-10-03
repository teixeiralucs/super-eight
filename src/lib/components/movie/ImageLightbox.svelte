<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import XIcon from '@lucide/svelte/icons/x';
	import { m } from '$lib/paraglide/messages';
	import type { ArtworkKind } from '$lib/movie/types';
	import { backdropUrl, logoUrl, posterUrl } from '$lib/tmdb/images';
	import MovieLogo from './MovieLogo.svelte';
	import type { MovieImage } from '$lib/tmdb/types';

	/**
	 * Imagem da galeria em tela cheia, para comparar antes de escolher: setas (← →, deslizar
	 * no celular) e o botão de usar a imagem ali mesmo. Esc fecha só o visualizador.
	 */
	let {
		images,
		index = $bindable(),
		kind,
		selectedPath,
		signedIn,
		movieId,
		submit,
		languageLabel,
		stage,
		onpreview,
		onClose
	}: {
		images: MovieImage[];
		index: number;
		kind: ArtworkKind;
		/** Imagem em uso (ou em prévia, sem login). */
		selectedPath: string | null;
		signedIn: boolean;
		movieId: number;
		submit: SubmitFunction;
		languageLabel: (key: string) => string;
		/** Fundo atrás das logos (o do filme). */
		stage: string | null;
		onpreview: (kind: Exclude<ArtworkKind, 'poster'>, path: string) => void;
		onClose: () => void;
	} = $props();

	const image = $derived(images[index]);
	const poster = $derived(kind === 'poster');
	const inUse = $derived(image?.path === selectedPath);

	/** Miniatura (já em cache) por baixo enquanto a versão grande carrega. */
	const thumb = (img: MovieImage) =>
		poster ? posterUrl(img.path, 'w342') : backdropUrl(img.path, 'w780');
	const large = (img: MovieImage) =>
		kind === 'logo'
			? logoUrl(img.path)
			: poster
				? posterUrl(img.path, 'w780')
				: backdropUrl(img.path, 'w1280');

	const go = (step: number) => {
		index = (index + step + images.length) % images.length;
	};

	// Pré-carrega as vizinhas: navegar fica instantâneo.
	$effect(() => {
		for (const step of [1, -1]) {
			const neighbor = images[(index + step + images.length) % images.length];
			if (neighbor) new Image().src = large(neighbor)!;
		}
	});

	let dialog: HTMLDivElement | undefined = $state();
	$effect(() => {
		dialog?.focus();
	});

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
		else if (event.key === 'ArrowRight') go(1);
		else if (event.key === 'ArrowLeft') go(-1);
		else return;
		event.preventDefault();
	}

	// Deslizar no celular.
	let touchX: number | null = null;
	const navButton =
		'absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-background/70 text-white/80 transition hover:border-white/50 hover:text-white';
</script>

<svelte:window onkeydown={onKeydown} />

<!-- data-nested-dialog: o painel de detalhes por baixo ignora o Esc enquanto este estiver aberto -->
<div
	bind:this={dialog}
	data-nested-dialog
	role="dialog"
	aria-modal="true"
	aria-label={m.lightbox_label()}
	tabindex="-1"
	class="fixed inset-0 z-[85] flex flex-col bg-background outline-none"
	transition:fade={{ duration: 150 }}
	ontouchstart={(event) => (touchX = event.touches[0].clientX)}
	ontouchend={(event) => {
		if (touchX === null) return;
		const delta = event.changedTouches[0].clientX - touchX;
		if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
		touchX = null;
	}}
>
	<!-- Topo: posição, idioma e fechar -->
	<header class="flex items-center justify-between gap-4 px-5 py-4 md:px-8">
		<p class="flex items-center gap-3 text-sm text-white/70">
			<span class="tabular-nums">
				{m.lightbox_counter({ current: index + 1, total: images.length })}
			</span>
			<span class="rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wider">
				{languageLabel(image.language ?? 'none')}
			</span>
		</p>
		<button
			type="button"
			onclick={onClose}
			class="grid size-10 place-items-center rounded-full border border-white/15 transition hover:border-white/40"
			aria-label={m.lightbox_close()}
		>
			<XIcon class="size-4" />
		</button>
	</header>

	<!-- Imagem -->
	<div class="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-24">
		{#key image.path}
			{#if kind === 'logo'}
				<div
					class="relative aspect-video w-full max-w-[min(100%,calc((100svh-12rem)*16/9))] overflow-hidden rounded-xl bg-white/5 bg-cover bg-center shadow-2xl ring-1 shadow-black/60 ring-white/10"
					style:background-image={stage ? `url(${stage})` : undefined}
					in:fade={{ duration: 150 }}
				>
					<div class="absolute inset-0 bg-background/55" aria-hidden="true"></div>
					<MovieLogo path={image.path} class="absolute inset-0 size-full object-contain p-[8%]" />
				</div>
			{:else}
				<div
					class={[
						'relative max-h-full overflow-hidden rounded-xl bg-cover bg-center shadow-2xl ring-1 shadow-black/60 ring-white/10',
						poster
							? 'aspect-2/3 h-full max-w-full'
							: 'aspect-video w-full max-w-[min(100%,calc((100svh-12rem)*16/9))]'
					]}
					style:background-image="url({thumb(image)})"
					in:fade={{ duration: 150 }}
				>
					<img src={large(image)} alt="" class="size-full object-contain" />
				</div>
			{/if}
		{/key}

		{#if images.length > 1}
			<button
				type="button"
				onclick={() => go(-1)}
				class="{navButton} left-3 md:left-8"
				aria-label={m.lightbox_prev()}
			>
				<ChevronLeftIcon class="size-5" />
			</button>
			<button
				type="button"
				onclick={() => go(1)}
				class="{navButton} right-3 md:right-8"
				aria-label={m.lightbox_next()}
			>
				<ChevronRightIcon class="size-5" />
			</button>
		{/if}
	</div>

	<!-- Ação -->
	<footer class="flex flex-col items-center gap-2 px-5 py-5">
		{#if inUse}
			<span
				class="inline-flex items-center gap-2 rounded-full bg-neon-pink px-6 py-2.5 text-sm font-semibold text-background"
			>
				<CheckIcon class="size-4" strokeWidth={3} aria-hidden="true" />
				{m.lightbox_in_use()}
			</span>
		{:else if signedIn}
			<form method="POST" action="/movie/{movieId}?/artwork" use:enhance={submit}>
				<input type="hidden" name="kind" value={kind} />
				<button
					name="path"
					value={image.path}
					class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
				>
					{{
						poster: m.lightbox_use_poster,
						backdrop: m.lightbox_use_backdrop,
						logo: m.lightbox_use_logo
					}[kind]()}
				</button>
			</form>
		{:else if kind !== 'poster'}
			<button
				type="button"
				onclick={() => onpreview(kind, image.path)}
				class="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-2.5 text-sm transition hover:border-white/50"
			>
				<EyeIcon class="size-4" aria-hidden="true" />
				{kind === 'logo' ? m.lightbox_preview_logo() : m.lightbox_preview_backdrop()}
			</button>
		{:else}
			<p class="text-xs text-white/50">{m.gallery_sign_in()}</p>
		{/if}
		<p class="hidden text-[11px] text-white/35 md:block">{m.lightbox_keys_hint()}</p>
	</footer>
</div>
