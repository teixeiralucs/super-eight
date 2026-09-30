<script lang="ts">
	// TEMPORÁRIO: marcador para telas ainda não construídas.
	let { title, text }: { title: string; text: string } = $props();
</script>

<main
	class="mx-auto grid min-h-[70svh] max-w-[1600px] place-items-center px-5 text-center md:px-10"
>
	<div class="max-w-md space-y-4">
		<p class="text-xs tracking-[0.3em] text-neon-cyan uppercase">Em breve</p>
		<h1 class="font-display text-4xl font-semibold tracking-[-0.03em]">{title}</h1>
		<p class="text-muted-foreground">{text}</p>
	</div>
</main>
