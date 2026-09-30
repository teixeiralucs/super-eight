<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PixelBackdrop from '$lib/components/auth/PixelBackdrop.svelte';
	import Logo from '$lib/components/brand/Logo.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="grid min-h-svh gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
	<!-- Imagem (topo no celular, direita no desktop) -->
	<!-- No desktop fica fixo na altura da janela enquanto o formulário rola -->
	<div
		class="h-44 overflow-hidden rounded-3xl ring-1 ring-white/10 lg:sticky lg:top-3 lg:order-2 lg:h-[calc(100svh-1.5rem)]"
	>
		<PixelBackdrop movies={data.backdrops} />
	</div>

	<!-- Formulário -->
	<div class="flex flex-col px-3 py-4 sm:px-8 lg:px-14 lg:py-8">
		<header class="flex items-center justify-between">
			<a href={resolve('/')} aria-label="Super Eight — início"><Logo class="h-9 w-auto" /></a>
			<a
				href={resolve('/')}
				class="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
			>
				<ArrowLeftIcon class="size-4" aria-hidden="true" /> Voltar ao início
			</a>
		</header>

		<main class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
			{@render children()}
		</main>
	</div>
</div>
