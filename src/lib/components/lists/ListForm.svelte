<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import LockIcon from '@lucide/svelte/icons/lock';
	import ShapesIcon from '@lucide/svelte/icons/shapes';
	import type { ListKind } from '$lib/lists/types';
	import { m } from '$lib/paraglide/messages';

	/** Campos da lista (criar e editar). */
	let {
		action,
		values,
		errors,
		submitLabel,
		onCancel,
		submit
	}: {
		action: string;
		values?: {
			title?: string;
			description?: string | null;
			kind?: ListKind;
			isPublic?: boolean;
		};
		errors?: Record<string, string[] | undefined>;
		submitLabel: string;
		onCancel: () => void;
		/** `use:enhance` personalizado (padrão: comportamento do SvelteKit). */
		submit?: SubmitFunction;
	} = $props();

	let saving = $state(false);
	const run: SubmitFunction = (input) => {
		saving = true;
		const done = submit?.(input);
		return async (options) => {
			const after = await done;
			if (after) await after(options);
			else await options.update();
			saving = false;
		};
	};

	const field =
		'w-full rounded-2xl border border-white/10 bg-background px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-neon-cyan';
	const option =
		'flex cursor-pointer flex-col gap-1 rounded-2xl border border-white/10 p-4 transition hover:border-white/30 has-[:checked]:border-white has-[:checked]:bg-white/[0.06]';
</script>

<form method="POST" {action} use:enhance={run} class="flex flex-col gap-5">
	<label class="flex flex-col gap-2">
		<span class="text-xs text-white/60">{m.list_field_title()}</span>
		<input
			name="title"
			required
			maxlength="80"
			value={values?.title ?? ''}
			placeholder={m.list_field_title_placeholder()}
			class={field}
			aria-invalid={Boolean(errors?.title)}
		/>
		{#if errors?.title}<span class="text-xs text-destructive">{errors.title[0]}</span>{/if}
	</label>

	<label class="flex flex-col gap-2">
		<span class="text-xs text-white/60">{m.list_field_description()}</span>
		<textarea
			name="description"
			rows="3"
			maxlength="500"
			placeholder={m.list_field_description_placeholder()}
			class="{field} resize-none">{values?.description ?? ''}</textarea
		>
		{#if errors?.description}
			<span class="text-xs text-destructive">{errors.description[0]}</span>
		{/if}
	</label>

	<fieldset class="flex flex-col gap-2">
		<legend class="mb-2 text-xs text-white/60">{m.list_field_kind()}</legend>
		<div class="grid gap-2 sm:grid-cols-2">
			<label class={option}>
				<input
					type="radio"
					name="kind"
					value="COLLECTION"
					checked={(values?.kind ?? 'COLLECTION') === 'COLLECTION'}
					class="sr-only"
				/>
				<span class="flex items-center gap-2 text-sm font-medium">
					<ShapesIcon class="size-4" aria-hidden="true" />
					{m.list_kind_collection()}
				</span>
				<span class="text-xs text-white/55">{m.list_kind_collection_hint()}</span>
			</label>
			<label class={option}>
				<input
					type="radio"
					name="kind"
					value="RANKED"
					checked={values?.kind === 'RANKED'}
					class="sr-only"
				/>
				<span class="flex items-center gap-2 text-sm font-medium">
					<ListOrderedIcon class="size-4" aria-hidden="true" />
					{m.list_kind_ranked()}
				</span>
				<span class="text-xs text-white/55">{m.list_kind_ranked_hint()}</span>
			</label>
		</div>
	</fieldset>

	<fieldset class="flex flex-col gap-2">
		<legend class="mb-2 text-xs text-white/60">{m.list_field_visibility()}</legend>
		<div class="grid gap-2 sm:grid-cols-2">
			<label class={option}>
				<input
					type="radio"
					name="isPublic"
					value="false"
					checked={!values?.isPublic}
					class="sr-only"
				/>
				<span class="flex items-center gap-2 text-sm font-medium">
					<LockIcon class="size-4" aria-hidden="true" />
					{m.list_private()}
				</span>
				<span class="text-xs text-white/55">{m.list_private_hint()}</span>
			</label>
			<label class={option}>
				<input
					type="radio"
					name="isPublic"
					value="true"
					checked={values?.isPublic ?? false}
					class="sr-only"
				/>
				<span class="flex items-center gap-2 text-sm font-medium">
					<GlobeIcon class="size-4" aria-hidden="true" />
					{m.list_public()}
				</span>
				<span class="text-xs text-white/55">{m.list_public_hint()}</span>
			</label>
		</div>
	</fieldset>

	<div class="mt-2 flex items-center justify-end gap-3">
		<button
			type="button"
			onclick={onCancel}
			class="rounded-full px-5 py-2.5 text-sm text-white/70 transition hover:text-white"
		>
			{m.list_cancel()}
		</button>
		<button
			disabled={saving}
			class="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
		>
			{submitLabel}
		</button>
	</div>
</form>
