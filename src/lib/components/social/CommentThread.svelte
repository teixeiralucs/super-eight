<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { formatRelative } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	import type { CommentView } from '$lib/social/types';
	import Avatar from './Avatar.svelte';

	/**
	 * Conversa de comentários (reviews e listas, §6.6): os comentários, apagar (autor ou dono do
	 * item) e o campo para escrever. As actions `comment`/`deleteComment` ficam em `base`.
	 */
	let {
		comments,
		signedIn,
		base,
		target,
		submit
	}: {
		/** Nulo = ainda carregando. */
		comments: CommentView[] | null;
		signedIn: boolean;
		/** Página que tem as actions (ex.: `/movie/603`; vazio = a atual). */
		base: string;
		/** Campo extra do formulário (ex.: `reviewId`). */
		target?: { name: string; value: string };
		submit: SubmitFunction;
	} = $props();
</script>

{#if comments && !comments.length}
	<p class="text-xs text-white/45">{m.comments_none()}</p>
{/if}
{#each comments ?? [] as comment (comment.id)}
	<div class="group flex items-start gap-2.5">
		<a
			href={resolve('/(app)/u/[username]', { username: comment.author.username })}
			class="shrink-0"
		>
			<Avatar user={comment.author} class="size-7 text-xs" />
		</a>
		<div class="min-w-0 flex-1 text-sm">
			<p>
				<a
					href={resolve('/(app)/u/[username]', { username: comment.author.username })}
					class="font-medium hover:underline">@{comment.author.username}</a
				>
				<span class="ml-1 text-xs text-white/40">{formatRelative(comment.createdAt)}</span>
			</p>
			<p class="whitespace-pre-line text-white/80">{comment.content}</p>
		</div>
		{#if comment.canDelete}
			<form method="POST" action="{base}?/deleteComment" use:enhance={submit}>
				<input type="hidden" name="commentId" value={comment.id} />
				<button
					class="grid size-7 place-items-center rounded-full text-white/35 transition hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
					aria-label={m.comments_delete()}
				>
					<Trash2Icon class="size-3.5" />
				</button>
			</form>
		{/if}
	</div>
{/each}
{#if signedIn}
	<form
		method="POST"
		action="{base}?/comment"
		use:enhance={submit}
		data-reset
		class="flex items-end gap-2"
	>
		{#if target}<input type="hidden" name={target.name} value={target.value} />{/if}
		<label class="min-w-0 flex-1">
			<span class="sr-only">{m.comments_placeholder()}</span>
			<textarea
				name="content"
				rows="1"
				maxlength="1000"
				required
				placeholder={m.comments_placeholder()}
				class="w-full resize-none border-b border-white/15 bg-transparent py-2 text-sm outline-none placeholder:text-white/30 focus:border-neon-cyan"
			></textarea>
		</label>
		<button
			class="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium transition hover:bg-white/20"
		>
			{m.comments_send()}
		</button>
	</form>
{/if}
