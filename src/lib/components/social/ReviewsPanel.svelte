<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { m } from '$lib/paraglide/messages';
	import type { MovieReviews, ReviewView } from '$lib/social/types';
	import ReviewCard from './ReviewCard.svelte';

	/**
	 * Aba Reviews dos detalhes do filme (§6.6): a sua review (escrever/editar) e as da
	 * comunidade — de quem você segue primeiro, depois as mais curtidas.
	 */
	let { movieId, signedIn, loginHref }: { movieId: number; signedIn: boolean; loginHref: string } =
		$props();

	let reviews = $state<MovieReviews | null>(null);
	let failed = $state(false);
	let editing = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const revive = (review: ReviewView): ReviewView => ({
		...review,
		createdAt: new Date(review.createdAt),
		updatedAt: new Date(review.updatedAt)
	});

	async function load() {
		const response = await fetch(`/api/movie/${movieId}/reviews`);
		if (!response.ok) {
			failed = true;
			return;
		}
		const data: MovieReviews = await response.json();
		reviews = { mine: data.mine && revive(data.mine), others: data.others.map(revive) };
	}

	$effect(() => {
		void load();
	});

	const submit: SubmitFunction = ({ action, cancel }) => {
		if (action.search.includes('deleteReview') && !confirm(m.reviews_delete_confirm())) {
			cancel();
			return;
		}
		saving = true;
		error = null;
		return async ({ result }) => {
			saving = false;
			if (result.type === 'success') {
				editing = false;
				await load();
			} else if (result.type === 'failure') {
				error = (result.data?.message as string) ?? m.error_could_not_save();
			} else if (result.type === 'error') {
				error = m.error_generic();
			}
		};
	};

	const base = $derived(`/movie/${movieId}`);
	const sectionLabel = 'mb-3 text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase';
</script>

<div class="space-y-8 pb-4">
	<!-- Sua review -->
	<section>
		<h2 class={sectionLabel}>{m.reviews_yours()}</h2>
		{#if !signedIn}
			<p class="text-sm text-white/60">
				{m.reviews_sign_in()}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- loginHref vem de resolve('/login') -->
				<a href={loginHref} class="ml-1 text-neon-cyan hover:underline">{m.auth_sign_in()}</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</p>
		{:else if !reviews}
			<div class="h-28 animate-pulse rounded-2xl bg-white/5" aria-hidden="true"></div>
		{:else if reviews.mine && !editing}
			<ReviewCard review={reviews.mine} {movieId} signedIn onChanged={load}>
				{#snippet header()}
					<div class="flex flex-1 items-center gap-2 text-xs text-white/50">
						<button
							type="button"
							onclick={() => (editing = true)}
							class="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 transition hover:border-white/40 hover:text-white"
						>
							<PencilIcon class="size-3.5" aria-hidden="true" />
							{m.reviews_edit()}
						</button>
						<form method="POST" action="{base}?/deleteReview" use:enhance={submit}>
							<button
								class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition hover:text-destructive"
							>
								<Trash2Icon class="size-3.5" aria-hidden="true" />
								{m.reviews_delete()}
							</button>
						</form>
					</div>
				{/snippet}
			</ReviewCard>
		{:else}
			<form
				method="POST"
				action="{base}?/review"
				use:enhance={submit}
				class="space-y-3 rounded-2xl border border-white/10 bg-background/60 p-5"
			>
				<label class="block">
					<span class="sr-only">{m.reviews_write()}</span>
					<textarea
						name="content"
						rows="5"
						maxlength="5000"
						required
						placeholder={m.reviews_placeholder()}
						class="w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-white/30"
						>{reviews.mine?.content ?? ''}</textarea
					>
				</label>
				<div
					class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"
				>
					<label class="flex cursor-pointer items-center gap-2 text-xs text-white/70">
						<input
							type="checkbox"
							name="containsSpoilers"
							checked={reviews.mine?.containsSpoilers ?? false}
							class="size-4 accent-[var(--neon-pink)]"
						/>
						{m.reviews_spoilers()}
					</label>
					<div class="flex items-center gap-2">
						{#if editing}
							<button
								type="button"
								onclick={() => (editing = false)}
								class="rounded-full px-4 py-2 text-xs text-white/60 hover:text-white"
								>{m.reviews_cancel()}</button
							>
						{/if}
						<button
							disabled={saving}
							class="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
						>
							{reviews.mine ? m.reviews_save() : m.reviews_publish()}
						</button>
					</div>
				</div>
			</form>
		{/if}
		{#if error}<p role="alert" class="mt-2 text-xs text-destructive">{error}</p>{/if}
	</section>

	<!-- Comunidade -->
	<section>
		<h2 class={sectionLabel}>{m.reviews_community()}</h2>
		{#if failed}
			<p class="text-sm text-white/50">{m.reviews_error()}</p>
		{:else if !reviews}
			<p class="text-sm text-white/50">{m.reviews_loading()}</p>
		{:else if !reviews.others.length}
			<p class="text-sm text-white/50">{m.reviews_none()}</p>
		{:else}
			<div class="space-y-3">
				{#each reviews.others as review (review.id)}
					<ReviewCard {review} {movieId} author={review.author} {signedIn} onChanged={load} />
				{/each}
			</div>
		{/if}
	</section>
</div>
