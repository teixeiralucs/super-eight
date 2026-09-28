<script lang="ts">
	// TEMPORÁRIO: página de detalhes será construída na próxima etapa (earlySetup.md §6.1.4).
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<main class="grid min-h-svh place-items-center p-8 text-center">
	<div class="space-y-4">
		<p class="text-sm tracking-[0.3em] text-muted-foreground uppercase">Em breve</p>
		<h1 class="font-display text-4xl font-semibold">Detalhes do filme #{page.params.id}</h1>
		<a href={resolve('/')} class="text-sm text-neon-cyan underline-offset-4 hover:underline"
			>← Voltar</a
		>
	</div>
</main>
