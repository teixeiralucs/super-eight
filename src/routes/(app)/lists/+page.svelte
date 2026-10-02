<script lang="ts">
	import ListVideoIcon from '@lucide/svelte/icons/list-video';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Modal from '$lib/components/Modal.svelte';
	import ListCard from '$lib/components/lists/ListCard.svelte';
	import ListForm from '$lib/components/lists/ListForm.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Reabre o formulário se a criação voltou com erro de validação.
	let creating = $derived(Boolean(form?.errors));
</script>

<svelte:head>
	<title>{m.lists_page_title()}</title>
</svelte:head>

<main class="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
	<header class="flex flex-wrap items-end justify-between gap-4 pb-2">
		<div>
			<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">{m.nav_lists()}</p>
			<h1
				class="mt-3 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-bold tracking-[-0.04em]"
			>
				{m.lists_heading()}<span class="font-serif font-normal tracking-normal text-white/40 italic"
					>.</span
				>
			</h1>
		</div>
		{#if data.lists.length}
			<button
				type="button"
				onclick={() => (creating = true)}
				class="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
			>
				<PlusIcon class="size-4" aria-hidden="true" />
				{m.lists_new()}
			</button>
		{/if}
	</header>

	{#if data.lists.length}
		<ul class="grid gap-6 md:grid-cols-2">
			{#each data.lists as list (list.id)}
				<li><ListCard {list} /></li>
			{/each}
		</ul>
	{:else}
		<section
			class="flex flex-col items-center gap-4 rounded-3xl border border-white/10 px-6 py-20 text-center"
		>
			<ListVideoIcon class="size-8 text-neon-purple" aria-hidden="true" />
			<h2 class="font-display text-2xl font-semibold">{m.lists_empty_title()}</h2>
			<p class="max-w-md text-sm text-muted-foreground">{m.lists_empty_text()}</p>
			<button
				type="button"
				onclick={() => (creating = true)}
				class="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
			>
				<PlusIcon class="size-4" aria-hidden="true" />
				{m.lists_new()}
			</button>
		</section>
	{/if}
</main>

{#if creating}
	<Modal title={m.lists_new()} onClose={() => (creating = false)}>
		<ListForm
			action="?/create"
			values={form?.values && {
				title: String(form.values.title ?? ''),
				description: String(form.values.description ?? ''),
				kind: form.values.kind === 'RANKED' ? 'RANKED' : 'COLLECTION',
				isPublic: form.values.isPublic === 'true'
			}}
			errors={form?.errors}
			submitLabel={m.list_create()}
			successMessage={m.toast_list_created()}
			onCancel={() => (creating = false)}
		/>
	</Modal>
{/if}
