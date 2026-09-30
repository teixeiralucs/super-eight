<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PlayIcon from '@lucide/svelte/icons/play';
	import StarIcon from '@lucide/svelte/icons/star';
	import XIcon from '@lucide/svelte/icons/x';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { formatDuration, formatLongDate } from '$lib/format';
	import {
		DETAIL_TABS,
		TAB_LABELS,
		type DetailTab,
		type MovieDetailData,
		type MovieUserData
	} from '$lib/movie/types';
	import { backdropUrl } from '$lib/tmdb/images';
	import DiaryPanel from './DiaryPanel.svelte';
	import LibraryControls from './LibraryControls.svelte';
	import MovieBackdrop from './MovieBackdrop.svelte';
	import TrailerModal from './TrailerModal.svelte';

	/**
	 * Detalhes do filme (referência "Joker"). Usado como página (/movie/[id]) e como painel
	 * sobreposto (shallow routing) — neste caso `onClose` fecha o painel.
	 */
	let { data, onClose }: { data: MovieDetailData; onClose?: () => void } = $props();

	const movie = $derived(data.movie);

	// Estado do usuário: começa com o do servidor e é atualizado pelas respostas das actions.
	let userData = $derived<MovieUserData | null>(data.userData);
	let message = $state<string | null>(null);

	let tab = $state<DetailTab>('about');
	const tabs = $derived(DETAIL_TABS.filter((t) => t !== 'diary' || data.signedIn));

	// Backdrop exibido (a galeria troca).
	let backdrop = $derived(movie.backdropPath);

	let trailerOpen = $state(false);
	let expanded = $state(false);
	let dateInput = $state<HTMLInputElement>();

	const submit: SubmitFunction = ({ formElement }) => {
		message = null;
		return async ({ result }) => {
			if (result.type === 'success' && result.data?.userData) {
				userData = result.data.userData as MovieUserData;
				if (formElement.getAttribute('action')?.endsWith('?/logSession')) formElement.reset();
				// Atualiza a página por baixo (ex.: grade do dashboard).
				invalidateAll();
			} else if (result.type === 'failure') {
				message = (result.data?.message as string) ?? 'Não foi possível salvar.';
			} else if (result.type === 'error') {
				message = 'Algo deu errado. Tente de novo.';
			}
		};
	};

	async function openDiary() {
		tab = 'diary';
		await tick();
		dateInput?.focus();
	}

	const regionNames = new Intl.DisplayNames('pt-BR', { type: 'region' });
	const country = (code: string) => {
		try {
			return regionNames.of(code) ?? code;
		} catch {
			return code;
		}
	};

	const facts = $derived(
		[
			{
				label: 'Estreia',
				value: movie.releaseDate ? formatLongDate(new Date(`${movie.releaseDate}T00:00:00Z`)) : null
			},
			{ label: 'Direção', value: movie.directors.join(', ') || null },
			{ label: 'Roteiro', value: movie.writers.join(', ') || null },
			{ label: 'Música', value: movie.composers.join(', ') || null },
			{ label: 'Gênero', value: movie.genres.join(', ') || null },
			{ label: 'País', value: movie.countries.map(country).join(', ') || null }
		].filter((fact) => fact.value)
	);

	const loginHref = $derived(
		`${resolve('/login')}?next=${encodeURIComponent(`/movie/${movie.id}`)}`
	);
</script>

<article class="relative isolate min-h-svh text-foreground">
	<MovieBackdrop path={backdrop} />

	<div class="grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
		<!-- Coluna principal -->
		<div class="relative flex flex-col px-5 pt-5 pb-10 md:px-10 lg:pl-24">
			<!-- Linha vertical com pontos (indicador de aba, como na referência) -->
			<div
				class="absolute top-28 bottom-10 left-10 hidden w-px bg-white/15 lg:block"
				aria-hidden="true"
			>
				<div class="absolute top-1/2 left-1/2 flex -translate-1/2 flex-col gap-3">
					{#each tabs as t (t)}
						<span
							class={[
								'block size-1.5 rounded-full transition',
								tab === t ? 'scale-150 bg-white' : 'bg-white/35'
							]}
						></span>
					{/each}
				</div>
			</div>

			<!-- Topo: voltar/fechar + abas -->
			<header class="flex flex-wrap items-center gap-x-6 gap-y-4">
				{#if onClose}
					<button
						type="button"
						onclick={onClose}
						class="grid size-10 place-items-center rounded-full border border-white/15 bg-background/60 transition hover:border-white/40"
						aria-label="Fechar detalhes"
					>
						<XIcon class="size-4" />
					</button>
				{:else}
					<a href={resolve('/')} aria-label="Super Eight — início"><Logo class="h-9 w-auto" /></a>
					<button
						type="button"
						onclick={() => history.back()}
						class="hidden items-center gap-1.5 text-sm text-white/60 transition hover:text-white sm:inline-flex"
					>
						<ArrowLeftIcon class="size-4" aria-hidden="true" /> Voltar
					</button>
				{/if}

				<div
					role="tablist"
					aria-label="Seções do filme"
					class="-mx-1 flex max-w-full min-w-0 gap-1 overflow-x-auto px-1"
				>
					{#each tabs as t (t)}
						<button
							type="button"
							role="tab"
							id="tab-{t}"
							aria-selected={tab === t}
							aria-controls="painel-{t}"
							onclick={() => (tab = t)}
							class={[
								'shrink-0 rounded-full px-4 py-1.5 text-xs font-medium tracking-[0.18em] uppercase transition',
								tab === t ? 'bg-white text-background' : 'text-white/70 hover:text-white'
							]}>{TAB_LABELS[t]}</button
						>
					{/each}
				</div>
			</header>

			<!-- Título -->
			<div class="mt-auto pt-24">
				<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
					{#if movie.year}<span class="tabular-nums">{movie.year}</span>{/if}
					{#if movie.runtime}<span aria-hidden="true" class="text-white/30">|</span><span
							>{formatDuration(movie.runtime)}</span
						>{/if}
					{#if movie.genres.length}<span aria-hidden="true" class="text-white/30">|</span><span
							>{movie.genres.slice(0, 3).join(', ')}</span
						>{/if}
					{#if movie.voteAverage}
						<span aria-hidden="true" class="text-white/30">|</span>
						<span class="inline-flex items-center gap-1" title="{movie.voteCount} votos no TMDb">
							<StarIcon class="size-3.5 fill-neon-peach text-neon-peach" aria-hidden="true" />
							{movie.voteAverage.toFixed(1)}
							<span class="text-white/40">TMDb</span>
						</span>
					{/if}
				</p>
				<h1
					class="mt-4 max-w-5xl font-display text-[clamp(2.75rem,7vw,7rem)] leading-[0.9] font-bold tracking-[-0.045em] text-balance"
				>
					{movie.title}
				</h1>
				{#if movie.originalTitle && movie.originalTitle !== movie.title}
					<p class="mt-3 text-sm text-white/50">{movie.originalTitle}</p>
				{/if}
				{#if movie.tagline}
					<p class="mt-5 font-serif text-2xl text-white/80 italic">{movie.tagline}</p>
				{/if}
			</div>

			<!-- Conteúdo da aba -->
			<div
				id="painel-{tab}"
				role="tabpanel"
				aria-labelledby="tab-{tab}"
				class="mt-8 min-h-56 max-w-3xl"
			>
				{#key tab}
					<div in:fade={{ duration: 250 }}>
						{#if tab === 'about'}
							{#if movie.overview}
								<p class={['text-base leading-relaxed text-white/80', !expanded && 'line-clamp-4']}>
									{movie.overview}
								</p>
								{#if movie.overview.length > 320}
									<button
										type="button"
										onclick={() => (expanded = !expanded)}
										class="mt-4 inline-flex items-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase"
									>
										{expanded ? 'Ler menos' : 'Ler mais'}
										<span class="h-px w-12 bg-white/60" aria-hidden="true"></span>
									</button>
								{/if}
							{:else}
								<p class="text-white/50">Sem sinopse em português por enquanto.</p>
							{/if}
						{:else if tab === 'cast'}
							{#if movie.cast.length}
								<ul class="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
									{#each movie.cast as person (person.id)}
										<li class="w-28 shrink-0">
											<div
												class="aspect-[2/3] overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10"
											>
												{#if person.profilePath}
													<img
														src="https://image.tmdb.org/t/p/w185{person.profilePath}"
														alt=""
														loading="lazy"
														class="size-full object-cover"
													/>
												{/if}
											</div>
											<p class="mt-2 truncate text-sm font-medium">{person.name}</p>
											<p class="truncate text-xs text-white/55">{person.character}</p>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="text-white/50">Elenco não informado.</p>
							{/if}
						{:else if tab === 'gallery'}
							{#if movie.gallery.length}
								<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
									{#each movie.gallery as path (path)}
										<li>
											<button
												type="button"
												onclick={() => (backdrop = path)}
												aria-pressed={backdrop === path}
												aria-label="Usar esta imagem como fundo"
												class={[
													'block aspect-video w-full overflow-hidden rounded-xl ring-1 transition',
													backdrop === path
														? 'ring-2 ring-white'
														: 'ring-white/10 hover:ring-white/40'
												]}
											>
												<img
													src={backdropUrl(path, 'w300')}
													alt=""
													loading="lazy"
													class="size-full object-cover"
												/>
											</button>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="text-white/50">Sem imagens disponíveis.</p>
							{/if}
						{:else if tab === 'diary' && userData}
							<DiaryPanel movieId={movie.id} sessions={userData.sessions} {submit} bind:dateInput />
						{/if}
					</div>
				{/key}
			</div>
		</div>

		<!-- Coluna lateral de vidro -->
		<aside
			class="flex flex-col gap-8 border-white/10 bg-background/70 px-5 py-8 md:px-10 lg:border-l lg:px-8 lg:pt-24"
			aria-label="Informações e sua biblioteca"
		>
			<dl class="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-1">
				{#each facts as fact (fact.label)}
					<div>
						<dt class="text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">
							{fact.label}
						</dt>
						<dd class="mt-1 text-sm text-white/90">{fact.value}</dd>
					</div>
				{/each}
			</dl>

			<div class="border-t border-white/10 pt-8">
				{#if data.signedIn && userData}
					<LibraryControls movieId={movie.id} {userData} {submit} onLogSession={openDiary} />
					{#if message}
						<p role="alert" class="mt-4 text-center text-xs text-destructive">{message}</p>
					{/if}
				{:else}
					<p class="text-sm text-white/70">Entre para salvar, avaliar e registrar este filme.</p>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- loginHref vem de resolve('/login') -->
					<a
						href={loginHref}
						class="mt-4 flex w-full justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
						>Entrar</a
					>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			</div>

			{#if movie.trailer}
				<button
					type="button"
					onclick={() => (trailerOpen = true)}
					aria-label="Ver trailer: {movie.trailer.name}"
					class="group relative mt-auto aspect-video overflow-hidden rounded-xl ring-1 ring-white/10"
				>
					<img
						src="https://i.ytimg.com/vi/{movie.trailer.key}/mqdefault.jpg"
						alt=""
						loading="lazy"
						class="size-full object-cover opacity-70 transition group-hover:opacity-100"
					/>
					<span
						class="absolute inset-0 flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase"
					>
						<span class="grid size-10 place-items-center rounded-full bg-white text-background"
							><PlayIcon class="ml-0.5 size-4 fill-current" /></span
						>
						Ver trailer
					</span>
				</button>
			{/if}
		</aside>
	</div>
</article>

{#if trailerOpen && movie.trailer}
	<TrailerModal trailer={movie.trailer} onClose={() => (trailerOpen = false)} />
{/if}
