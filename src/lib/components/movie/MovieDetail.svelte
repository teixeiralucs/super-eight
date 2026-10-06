<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { refreshAll, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PlayIcon from '@lucide/svelte/icons/play';
	import StarIcon from '@lucide/svelte/icons/star';
	import XIcon from '@lucide/svelte/icons/x';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { countryName, formatDuration, formatLongDate, languageName } from '$lib/format';
	import {
		DETAIL_TABS,
		tabLabel,
		type ArtworkKind,
		type DetailTab,
		type MovieDetailData,
		type MovieUserData
	} from '$lib/movie/types';
	import { actionName, withFeedback } from '$lib/feedback/submit';
	import type { ConfirmOptions } from '$lib/feedback/confirm.svelte';
	import GalleryPanel from './GalleryPanel.svelte';
	import { facetParams, releaseKey, type Facet } from '$lib/library/facets';
	import LibraryControls from './LibraryControls.svelte';
	import MovieBackdrop from './MovieBackdrop.svelte';
	import MovieLogo from './MovieLogo.svelte';
	import PersonCard from './PersonCard.svelte';
	import WatchProviders from './WatchProviders.svelte';
	import ReviewsPanel from '$lib/components/social/ReviewsPanel.svelte';
	import TrailerModal from './TrailerModal.svelte';

	/**
	 * Detalhes do filme (referência "Joker"). Usado como página (/movie/[id]) e como painel
	 * sobreposto (shallow routing) — neste caso `onClose` fecha o painel.
	 */
	let { data, onClose }: { data: MovieDetailData; onClose?: () => void } = $props();

	const movie = $derived(data.movie);

	// Estado do usuário: começa com o do servidor e é atualizado pelas respostas das actions.
	let userData = $derived<MovieUserData | null>(data.userData);

	// Página aberta com `?tab=reviews` (ex.: link de uma notificação) já começa na aba pedida.
	const requestedTab = page.url.searchParams.get('tab');
	let tab = $state<DetailTab>(
		untrack(() =>
			!onClose && DETAIL_TABS.includes(requestedTab as DetailTab)
				? (requestedTab as DetailTab)
				: 'about'
		)
	);
	// Fora do "Sobre" a tela fica mais leve: some a linha de dados e a frase do filme.
	const compact = $derived(tab !== 'about');

	// Fundo: o escolhido pelo usuário (DNA do filme) ou o padrão; sem login, a galeria só faz prévia.
	let backdrop = $derived(userData?.artwork?.backdropPath ?? movie.backdropPath);
	// Título: a logo escolhida, a padrão ou (sem logo no TMDb) o texto.
	let logo = $derived(userData?.artwork?.logoPath ?? movie.logoPath);

	let trailerOpen = $state(false);

	/** Aplica a resposta das actions (estado novo do usuário); erros viram toast (withFeedback). */
	const applyUserData: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success' && result.data?.userData) {
				userData = result.data.userData as MovieUserData;
				// No painel sobreposto, o histórico guarda uma cópia dos dados do filme: atualiza
				// a cópia para que voltar/avançar não reabra uma versão antiga.
				if (page.state.movie) {
					replaceState('', { movie: { ...page.state.movie, userData } });
					// Atualiza a página por baixo (ex.: grade do dashboard) sem zerar `page.state`
					// — `invalidateAll()` zera e fechava o painel no meio da ação.
					void refreshAll();
				}
				// Página direta (/movie/[id]): a resposta já traz o estado novo. Recarregar aqui
				// deixava um recarregamento lento de uma ação anterior sobrescrever a seguinte.
			}
		};
	};

	type SubmitInput = Parameters<SubmitFunction>[0];

	/** Confirmação das ações destrutivas, por action. */
	const confirmFor = (input: SubmitInput): ConfirmOptions | null => {
		switch (actionName(input)) {
			case 'remove':
				return {
					title: m.confirm_remove_library_title(),
					description: m.confirm_remove_library_text(),
					confirmLabel: m.action_remove(),
					destructive: true
				};
			case 'deleteSession': {
				const id = input.formData.get('sessionId');
				const session = userData?.sessions.find((s) => s.id === id);
				return {
					title: m.confirm_delete_session_title({
						date: session ? formatLongDate(session.watchedAt) : ''
					}),
					description: m.confirm_delete_session_text(),
					confirmLabel: m.action_delete(),
					destructive: true
				};
			}
			default:
				return null;
		}
	};

	/** Toast de sucesso, por action (já com o estado novo aplicado). */
	const successFor = (input: SubmitInput): string | null => {
		const form = input.formData;
		const list = (id: unknown) => userData?.lists.find((l) => l.id === id);
		switch (actionName(input)) {
			case 'add':
				return m.toast_added_watchlist();
			case 'remove':
				return m.toast_removed_library();
			case 'rate': {
				const rating = Number(form.get('rating'));
				return rating ? m.toast_rating_saved({ rating }) : m.toast_rating_removed();
			}
			case 'favorite':
				return userData?.library?.isFavorite ? m.toast_favorited() : m.toast_unfavorited();
			case 'logSession':
				return m.toast_session_logged();
			case 'deleteSession':
				return m.toast_session_deleted();
			case 'artwork':
				if (!form.get('path')) return m.toast_artwork_restored();
				return (
					{
						poster: m.toast_poster_updated,
						backdrop: m.toast_backdrop_updated,
						logo: m.toast_logo_updated
					}[form.get('kind') as ArtworkKind]?.() ?? null
				);
			case 'toggleList': {
				const target = list(form.get('listId'));
				if (!target) return null;
				return target.contains
					? m.toast_list_added({ title: target.title })
					: m.toast_list_removed({ title: target.title });
			}
			case 'quickList':
				return m.toast_list_created_with({ title: String(form.get('title') ?? '') });
			default:
				return null;
		}
	};

	const submit = withFeedback(applyUserData, { confirm: confirmFor, success: successFor });

	const longDate = (iso: string | null) =>
		iso ? formatLongDate(new Date(`${iso}T00:00:00Z`)) : null;

	// Direção e roteiro aparecem com foto na aba Elenco.
	/**
	 * Logado, cada valor leva à biblioteca filtrada por ele (§6.10): pessoa, país, idioma,
	 * gênero, estúdio e dia de lançamento. Sem login, só texto.
	 */
	const facetHref = (facet: Facet, value: string | number) =>
		data.signedIn
			? resolve('/(app)/library/[facet]/[value]', facetParams(facet, value))
			: undefined;

	type FactPart = { text: string; href?: string };
	const facts = $derived(
		(
			[
				// Estreia no país do usuário quando o TMDb tem; senão, a mundial. O link usa sempre
				// a data original (a da biblioteca): se a local for outra, ela aparece à parte.
				movie.regionalRelease && movie.regionalRelease !== movie.releaseDate
					? {
							label: m.fact_release(),
							parts: [{ text: `${longDate(movie.regionalRelease)} (${countryName(data.region)})` }],
							wide: true
						}
					: null,
				{
					label:
						movie.regionalRelease && movie.regionalRelease !== movie.releaseDate
							? m.fact_release_original()
							: m.fact_release(),
					parts: movie.releaseDate
						? [
								{
									text:
										movie.regionalRelease === movie.releaseDate
											? `${longDate(movie.releaseDate)} (${countryName(data.region)})`
											: longDate(movie.releaseDate)!,
									href: facetHref('release', releaseKey(movie.releaseDate))
								}
							]
						: [],
					wide: true
				},
				{
					label: m.fact_country(),
					parts: movie.countries.map((code) => ({
						text: countryName(code),
						href: facetHref('country', code)
					}))
				},
				{
					label: m.fact_original_language(),
					parts: movie.originalLanguage
						? [
								{
									text: languageName(movie.originalLanguage),
									href: facetHref('language', movie.originalLanguage)
								}
							]
						: []
				},
				{
					label: m.fact_genre(),
					parts: movie.genres.map((name, i) => ({
						text: name,
						href: movie.genreIds[i] ? facetHref('genre', movie.genreIds[i]) : undefined
					})),
					wide: true
				},
				{
					label: m.fact_studio(),
					parts: movie.studios.map((studio) => ({
						text: studio.name,
						href: facetHref('studio', studio.id)
					})),
					wide: true
				},
				{
					label: m.fact_music(),
					parts: movie.composers.map((person) => ({
						text: person.name,
						href: facetHref('person', person.id)
					})),
					wide: true
				},
				// Saga do TMDb: logado, leva à coleção com os filmes da biblioteca (§6.8).
				{
					label: m.fact_collection(),
					parts: movie.collection
						? [
								{
									text: movie.collection.name,
									href: data.signedIn
										? resolve('/(app)/lists/collections/[id]', {
												id: String(movie.collection.id)
											})
										: undefined
								}
							]
						: [],
					wide: true
				}
			] as ({ label: string; parts: FactPart[]; wide?: boolean } | null)[]
		).filter((fact) => fact !== null && fact.parts.length) as {
			label: string;
			parts: FactPart[];
			wide?: boolean;
		}[]
	);

	const crew = $derived(
		[
			{ label: m.crew_directing(), people: movie.directing },
			{ label: m.crew_writing(), people: movie.writing }
		].filter((group) => group.people.length)
	);

	const loginHref = $derived(
		`${resolve('/login')}?next=${encodeURIComponent(`/movie/${movie.id}`)}`
	);

	const sectionLabel = 'mb-3 text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase';
	const factLabel = 'text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase';
</script>

<article class="relative isolate text-foreground lg:h-svh">
	<MovieBackdrop path={backdrop} />

	<div class="grid min-h-svh grid-cols-1 lg:h-full lg:grid-cols-[minmax(0,1fr)_360px]">
		<!-- Coluna principal -->
		<div
			class="relative flex min-w-0 flex-col px-5 pt-5 pb-8 md:px-10 lg:min-h-0 lg:overflow-y-auto lg:pl-24"
		>
			<!-- Linha vertical com pontos (indicador de aba, como na referência) -->
			<div
				class="absolute top-28 bottom-10 left-10 hidden w-px bg-white/15 lg:block"
				aria-hidden="true"
			>
				<div class="absolute top-1/2 left-1/2 flex -translate-1/2 flex-col gap-3">
					{#each DETAIL_TABS as t (t)}
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
						aria-label={m.close_details()}
					>
						<XIcon class="size-4" />
					</button>
				{:else}
					<a href={resolve('/')} aria-label={m.nav_home()}><Logo class="h-9 w-auto" /></a>
					<button
						type="button"
						onclick={() => history.back()}
						class="hidden items-center gap-1.5 text-sm text-white/60 transition hover:text-white sm:inline-flex"
					>
						<ArrowLeftIcon class="size-4" aria-hidden="true" />
						{m.back()}
					</button>
				{/if}

				<div
					role="tablist"
					aria-label={m.tabs_label()}
					class="-mx-1 flex max-w-full min-w-0 gap-1 overflow-x-auto px-1"
				>
					{#each DETAIL_TABS as t (t)}
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
							]}>{tabLabel(t)}</button
						>
					{/each}
				</div>
			</header>

			<!-- Espaço flexível: na galeria encolhe e o título sobe para o topo -->
			<div
				class="min-h-8 shrink-0 transition-[flex-grow] duration-500 ease-out"
				style:flex-grow={tab === 'gallery' ? 0 : 1}
			></div>

			<!-- Título -->
			<div>
				<div class={['collapsible', compact && 'is-collapsed']}>
					<div class="min-h-0 overflow-hidden">
						<p
							class="flex flex-wrap items-center gap-x-3 gap-y-1 pb-4 text-sm text-white/70"
							aria-hidden={compact}
						>
							{#if movie.year}<span class="tabular-nums">{movie.year}</span>{/if}
							{#if movie.runtime}<span aria-hidden="true" class="text-white/30">|</span><span
									>{formatDuration(movie.runtime)}</span
								>{/if}
							{#if movie.genres.length}<span aria-hidden="true" class="text-white/30">|</span><span
									>{movie.genres.slice(0, 3).join(', ')}</span
								>{/if}
							{#if movie.voteAverage}
								<span aria-hidden="true" class="text-white/30">|</span>
								<span
									class="inline-flex items-center gap-1"
									title={m.votes_on_tmdb({ count: movie.voteCount })}
								>
									<StarIcon class="size-3.5 fill-neon-peach text-neon-peach" aria-hidden="true" />
									{movie.voteAverage.toFixed(1)}
									<span class="text-white/40">TMDb</span>
								</span>
							{/if}
						</p>
					</div>
				</div>
				{#if logo}
					<h1 lang={movie.originalLanguage ?? undefined}>
						<span class="sr-only">{movie.originalTitle}</span>
						<MovieLogo
							path={logo}
							class={[
								'block w-auto max-w-[min(100%,40rem)] object-contain object-left-bottom transition-[height] duration-500 ease-out',
								compact ? 'h-[clamp(3.5rem,7vw,5.5rem)]' : 'h-[clamp(6rem,15vw,12rem)]'
							]}
						/>
					</h1>
				{:else}
					<h1
						class={[
							'max-w-5xl font-display leading-[0.9] font-bold tracking-[-0.045em] text-balance transition-[font-size] duration-500 ease-out',
							compact ? 'text-[clamp(2.25rem,4.5vw,4.25rem)]' : 'text-[clamp(2.75rem,7vw,7rem)]'
						]}
						lang={movie.originalLanguage ?? undefined}
					>
						{movie.originalTitle}
					</h1>
				{/if}
				<div class={['collapsible', compact && 'is-collapsed']}>
					<div class="min-h-0 overflow-hidden" aria-hidden={compact}>
						{#if movie.tagline}
							<p class="pt-4 font-serif text-2xl text-white/80 italic">{movie.tagline}</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Conteúdo da aba -->
			<div
				id="painel-{tab}"
				role="tabpanel"
				aria-labelledby="tab-{tab}"
				class={[
					'mt-6 min-w-0',
					(tab === 'about' || tab === 'reviews') && 'max-w-3xl',
					tab === 'gallery' && 'lg:min-h-0 lg:flex-1'
				]}
			>
				{#key tab}
					<div in:fade={{ duration: 250 }} class="h-full">
						{#if tab === 'about'}
							{#if movie.overview}
								<p class="text-base leading-relaxed text-white/80">{movie.overview}</p>
							{:else}
								<p class="text-white/50">{m.no_overview()}</p>
							{/if}
						{:else if tab === 'cast'}
							<div class="space-y-6">
								{#if crew.length}
									<div class="-mx-1 flex gap-10 overflow-x-auto px-1">
										{#each crew as group (group.label)}
											<section class="shrink-0">
												<h2 class={sectionLabel}>{group.label}</h2>
												<ul class="flex gap-4">
													{#each group.people as person (person.id)}
														<PersonCard
															name={person.name}
															role={person.job}
															profilePath={person.profilePath}
															href={facetHref('person', person.id)}
														/>
													{/each}
												</ul>
											</section>
										{/each}
									</div>
								{/if}
								<section>
									<h2 class={sectionLabel}>{m.crew_cast()}</h2>
									{#if movie.cast.length}
										<ul class="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
											{#each movie.cast as person (person.id)}
												<PersonCard
													name={person.name}
													role={person.character}
													profilePath={person.profilePath}
													href={facetHref('person', person.id)}
												/>
											{/each}
										</ul>
									{:else}
										<p class="text-white/50">{m.cast_unknown()}</p>
									{/if}
								</section>
							</div>
						{:else if tab === 'gallery'}
							<GalleryPanel
								movieId={movie.id}
								signedIn={data.signedIn}
								artwork={userData?.artwork ?? null}
								defaults={{
									posterPath: movie.posterPath,
									backdropPath: movie.backdropPath,
									logoPath: movie.logoPath
								}}
								preview={{ backdropPath: backdrop, logoPath: logo }}
								onpreview={(kind, path) => {
									if (kind === 'logo') logo = path;
									else backdrop = path;
								}}
								{submit}
							/>
						{:else if tab === 'reviews'}
							<ReviewsPanel movieId={movie.id} signedIn={data.signedIn} {loginHref} />
						{/if}
					</div>
				{/key}
			</div>
		</div>

		<!-- Coluna lateral -->
		<aside
			class="flex flex-col gap-7 border-white/10 bg-background/70 px-5 py-8 md:px-10 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:px-8 lg:pt-20"
			aria-label={m.sidebar_label()}
		>
			<!-- Títulos em texto: a logo do título pode estar em outro idioma -->
			<dl class="space-y-3">
				<div>
					<dt class={factLabel}>{m.fact_original_title()}</dt>
					<dd
						class="mt-1 font-display text-xl leading-tight font-semibold tracking-[-0.02em] text-balance"
						lang={movie.originalLanguage ?? undefined}
					>
						{movie.originalTitle}
					</dd>
				</div>
				{#if movie.title !== movie.originalTitle}
					<div>
						<dt class={factLabel}>{m.fact_translated_title()}</dt>
						<dd class="mt-1 text-base leading-snug text-white/90">{movie.title}</dd>
					</div>
				{/if}
			</dl>

			<dl class="grid grid-cols-2 gap-x-6 gap-y-4">
				{#each facts as fact (fact.label)}
					<div class={[fact.wide && 'col-span-2']}>
						<dt class={factLabel}>{fact.label}</dt>
						<dd class="mt-1 text-sm text-white/90">
							{#each fact.parts as part, i (i)}
								{#if i}<span class="text-white/40">, </span>{/if}
								{#if part.href}
									<!-- eslint-disable svelte/no-navigation-without-resolve -- href vem de resolve() (facetHref) -->
									<a
										href={part.href}
										title={m.facet_link_title()}
										class="underline decoration-white/25 underline-offset-4 transition hover:text-neon-cyan hover:decoration-neon-cyan"
										>{part.text}</a
									>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								{:else}
									{part.text}
								{/if}
							{/each}
						</dd>
					</div>
				{/each}
			</dl>

			<WatchProviders
				watch={movie.watch}
				region={data.region}
				services={data.services}
				labelClass={factLabel}
			/>

			<div class="border-t border-white/10 pt-7">
				{#if data.signedIn && userData}
					<LibraryControls movieId={movie.id} {userData} {submit} />
				{:else}
					<p class="text-sm text-white/70">{m.sign_in_to_save()}</p>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- loginHref vem de resolve('/login') -->
					<a
						href={loginHref}
						class="mt-4 flex w-full justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
						>{m.auth_sign_in()}</a
					>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			</div>

			{#if movie.trailer}
				<button
					type="button"
					onclick={() => (trailerOpen = true)}
					aria-label={m.watch_trailer_named({ name: movie.trailer.name })}
					class="group relative mt-auto aspect-video shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10"
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
						{m.watch_trailer()}
					</span>
				</button>
			{/if}
		</aside>
	</div>
</article>

{#if trailerOpen && movie.trailer}
	<TrailerModal trailer={movie.trailer} onClose={() => (trailerOpen = false)} />
{/if}

<style>
	/* Some/aparece animando a altura (0fr ↔ 1fr), sem medir nada em JS. */
	.collapsible {
		display: grid;
		grid-template-rows: 1fr;
		transition:
			grid-template-rows 500ms ease-out,
			opacity 300ms ease-out;
	}

	.collapsible.is-collapsed {
		grid-template-rows: 0fr;
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.collapsible,
		h1,
		h1 :global(img) {
			transition: none;
		}
	}
</style>
