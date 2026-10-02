<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import LockIcon from '@lucide/svelte/icons/lock';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import AnchoredPopover from '$lib/components/AnchoredPopover.svelte';
	import { plural } from '$lib/i18n';
	import type { ListMembership } from '$lib/lists/types';
	import { m } from '$lib/paraglide/messages';

	/** Listas do usuário com o filme marcado/desmarcado + criação rápida (ver AnchoredPopover). */
	let {
		movieId,
		lists,
		submit,
		anchor,
		onClose
	}: {
		movieId: number;
		lists: ListMembership[];
		submit: SubmitFunction;
		anchor: HTMLElement;
		onClose: () => void;
	} = $props();

	/** Lista sendo alternada (marcação otimista enquanto o servidor responde). */
	let pending = $state<string | null>(null);

	const submitToggle: SubmitFunction = async (input) => {
		pending = input.formData.get('listId') as string;
		const done = await submit(input);
		return async (options) => {
			await done?.(options);
			pending = null;
		};
	};

	const submitQuick: SubmitFunction = async (input) => {
		const done = await submit(input);
		return async (options) => {
			await done?.(options);
			if (options.result.type === 'success') input.formElement.reset();
		};
	};
</script>

<AnchoredPopover
	{anchor}
	label={m.lists_popup_label()}
	heading={m.lists_button()}
	closeLabel={m.lists_close()}
	{onClose}
>
	<div class="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-2">
		{#if lists.length}
			<ul class="space-y-1">
				{#each lists as list (list.id)}
					{@const checked = pending === list.id ? !list.contains : list.contains}
					<li>
						<form method="POST" action="/movie/{movieId}?/toggleList" use:enhance={submitToggle}>
							<input type="hidden" name="listId" value={list.id} />
							<button
								role="checkbox"
								aria-checked={checked}
								disabled={pending !== null}
								class="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/5 disabled:cursor-wait"
							>
								<span
									class={[
										'grid size-5 shrink-0 place-items-center rounded-md border transition',
										checked ? 'border-neon-pink bg-neon-pink text-background' : 'border-white/25'
									]}
									aria-hidden="true"
								>
									{#if checked}<CheckIcon class="size-3.5" strokeWidth={3} />{/if}
								</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm">{list.title}</span>
									<span class="flex items-center gap-1.5 text-xs text-white/45">
										{#if list.kind === 'RANKED'}<ListOrderedIcon
												class="size-3"
												aria-hidden="true"
											/>{/if}
										{plural(list.count, m.movies_count_one, m.movies_count_other)}
										{#if !list.isPublic}<LockIcon
												class="size-3"
												aria-label={m.list_private()}
											/>{/if}
									</span>
								</span>
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-2 py-3 text-sm text-white/50">{m.lists_popup_empty()}</p>
		{/if}
	</div>

	<div class="border-t border-white/10 px-6 pt-4 pb-5">
		<form
			method="POST"
			action="/movie/{movieId}?/quickList"
			use:enhance={submitQuick}
			class="flex items-center gap-2"
		>
			<label class="min-w-0 flex-1">
				<span class="sr-only">{m.lists_quick_placeholder()}</span>
				<input
					name="title"
					required
					maxlength="80"
					placeholder={m.lists_quick_placeholder()}
					data-autofocus
					class="w-full border-b border-white/15 bg-transparent py-2 text-sm outline-none placeholder:text-white/30 focus:border-neon-cyan"
				/>
			</label>
			<button
				class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
			>
				<PlusIcon class="size-3.5" aria-hidden="true" />
				{m.lists_quick_create()}
			</button>
		</form>
		<a
			href={resolve('/lists')}
			class="mt-4 inline-flex items-center gap-1 text-xs text-white/50 transition hover:text-white"
		>
			{m.lists_see_all()}
			<ArrowRightIcon class="size-3.5" aria-hidden="true" />
		</a>
	</div>
</AnchoredPopover>
