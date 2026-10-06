<script lang="ts">
	import { actionName, withFeedback } from '$lib/feedback/submit';
	import type { Snippet } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import RatingBadge from '$lib/components/dashboard/RatingBadge.svelte';
	import { formatRelative } from '$lib/format';
	import { plural } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';
	import type { CommentView, UserChip } from '$lib/social/types';
	import Avatar from './Avatar.svelte';
	import CommentThread from './CommentThread.svelte';

	/**
	 * Uma review: autor (ou o filme, no perfil), nota, texto com aviso de spoiler, curtir e
	 * comentários (carregados ao abrir). As actions vivem em /movie/[id] (§5.2.5).
	 */
	let {
		review,
		movieId,
		author,
		signedIn,
		onChanged,
		header
	}: {
		review: {
			id: string;
			content: string;
			containsSpoilers: boolean;
			createdAt: Date;
			updatedAt: Date;
			rating: number | null;
			likeCount: number;
			commentCount: number;
			likedByMe: boolean;
			isMine: boolean;
			followed?: boolean;
		};
		movieId: number;
		/** Autor (omitido no perfil, onde o `header` mostra o filme). */
		author?: UserChip;
		signedIn: boolean;
		/** Depois de curtir/comentar: recarregar quem lista as reviews. */
		onChanged: () => void | Promise<void>;
		header?: Snippet;
	} = $props();

	let revealed = $state(false);
	const hidden = $derived(review.containsSpoilers && !review.isMine && !revealed);

	let commentsOpen = $state(false);
	let comments = $state<CommentView[] | null>(null);

	async function loadComments() {
		const response = await fetch(`/api/reviews/${review.id}/comments`);
		const data: CommentView[] = response.ok ? await response.json() : [];
		comments = data.map((c) => ({ ...c, createdAt: new Date(c.createdAt) }));
	}

	async function toggleComments() {
		commentsOpen = !commentsOpen;
		if (commentsOpen && !comments) await loadComments();
	}

	/** Toda action daqui: sem recarregar a página; avisa quem lista e atualiza os comentários. */
	const refresh: SubmitFunction = ({ formElement }) => {
		return async ({ result }) => {
			if (result.type === 'success') {
				if (formElement.dataset.reset !== undefined) formElement.reset();
				await Promise.all([onChanged(), commentsOpen ? loadComments() : null]);
			}
		};
	};

	// Curtir e comentar já aparecem na hora; só apagar comentário pede confirmação e avisa.
	const submit = withFeedback(refresh, {
		confirm: (input) =>
			actionName(input) === 'deleteComment'
				? {
						title: m.confirm_delete_comment_title(),
						confirmLabel: m.action_delete(),
						destructive: true
					}
				: null,
		success: (input) => (actionName(input) === 'deleteComment' ? m.toast_comment_deleted() : null)
	});

	const base = $derived(`/movie/${movieId}`);
	const edited = $derived(review.updatedAt.getTime() - review.createdAt.getTime() > 60_000);
</script>

<article class="rounded-2xl border border-white/10 bg-background/60 p-5">
	<header class="flex items-start gap-3">
		{#if header}
			{@render header()}
		{:else if author}
			<a href={resolve('/(app)/u/[username]', { username: author.username })} class="shrink-0">
				<Avatar user={author} />
			</a>
			<div class="min-w-0 flex-1">
				<p class="flex flex-wrap items-center gap-x-2 text-sm">
					<a
						href={resolve('/(app)/u/[username]', { username: author.username })}
						class="font-medium hover:underline">{author.name ?? `@${author.username}`}</a
					>
					{#if author.name}<span class="text-white/45">@{author.username}</span>{/if}
					{#if review.followed}
						<span class="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70"
							>{m.reviews_following()}</span
						>
					{/if}
				</p>
				<p class="text-xs text-white/45">
					{formatRelative(review.createdAt)}{#if edited}
						· {m.reviews_edited()}{/if}
				</p>
			</div>
		{/if}
		{#if review.rating}<RatingBadge rating={review.rating} class="shrink-0 text-sm" />{/if}
	</header>

	<div class="relative mt-4">
		<p
			class={[
				'text-[15px] leading-relaxed whitespace-pre-line text-white/85',
				hidden && 'pointer-events-none blur-sm select-none'
			]}
			aria-hidden={hidden}
		>
			{review.content}
		</p>
		{#if hidden}
			<div class="absolute inset-0 grid place-items-center">
				<button
					type="button"
					onclick={() => (revealed = true)}
					class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-background/90 px-4 py-2 text-xs"
				>
					<EyeOffIcon class="size-3.5" aria-hidden="true" />
					{m.spoiler_warning()}
					<span class="font-semibold text-neon-pink">{m.spoiler_reveal()}</span>
				</button>
			</div>
		{/if}
	</div>

	<footer class="mt-4 flex items-center gap-4 text-xs text-white/55">
		{#if signedIn && !review.isMine}
			<form method="POST" action="{base}?/likeReview" use:enhance={submit}>
				<input type="hidden" name="reviewId" value={review.id} />
				<button
					aria-pressed={review.likedByMe}
					aria-label={review.likedByMe ? m.unlike() : m.like()}
					class="inline-flex items-center gap-1.5 transition hover:text-white"
				>
					<HeartIcon
						class={['size-4', review.likedByMe && 'fill-neon-pink text-neon-pink']}
						aria-hidden="true"
					/>
					{plural(review.likeCount, m.likes_count_one, m.likes_count_other)}
				</button>
			</form>
		{:else}
			<span class="inline-flex items-center gap-1.5">
				<HeartIcon class="size-4" aria-hidden="true" />
				{plural(review.likeCount, m.likes_count_one, m.likes_count_other)}
			</span>
		{/if}
		<button
			type="button"
			onclick={toggleComments}
			aria-expanded={commentsOpen}
			class="inline-flex items-center gap-1.5 transition hover:text-white"
		>
			<MessageCircleIcon class="size-4" aria-hidden="true" />
			{review.commentCount
				? plural(review.commentCount, m.comments_count_one, m.comments_count_other)
				: m.comments_show()}
		</button>
	</footer>

	{#if commentsOpen}
		<div class="mt-4 space-y-3 border-t border-white/10 pt-4">
			<CommentThread
				{comments}
				{signedIn}
				{base}
				target={{ name: 'reviewId', value: review.id }}
				{submit}
			/>
		</div>
	{/if}
</article>
