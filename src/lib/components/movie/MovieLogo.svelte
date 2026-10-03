<script module lang="ts">
	/** Tom já medido por URL: a mesma logo aparece no título, na galeria e no visualizador. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- cache do módulo; a reatividade vem de `measured`
	const tones = new Map<string, boolean>();

	/**
	 * Logo preta/cinza-escura? Média do brilho (maior canal RGB, não a luminância: logos
	 * vermelhas têm luminância baixa e ficam bem no fundo escuro) dos pixels visíveis numa
	 * miniatura 32×32. O TMDb libera CORS nas imagens, então o canvas pode ser lido.
	 */
	function isDark(img: HTMLImageElement) {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 32;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) return false;
		context.drawImage(img, 0, 0, 32, 32);
		const { data } = context.getImageData(0, 0, 32, 32);
		let brightness = 0;
		let weight = 0;
		for (let i = 0; i < data.length; i += 4) {
			const alpha = data[i + 3] / 255;
			brightness += alpha * Math.max(data[i], data[i + 1], data[i + 2]);
			weight += alpha;
		}
		return weight > 0 && brightness / weight < 64;
	}
</script>

<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import { logoUrl } from '$lib/tmdb/images';

	/**
	 * Logo do título do filme. Muitas logos do TMDb são pretas sobre transparente e sumiriam
	 * no fundo escuro do app: essas aparecem em branco.
	 */
	let {
		path,
		alt = '',
		loading,
		class: className
	}: { path: string; alt?: string; loading?: 'lazy' | 'eager'; class?: ClassValue } = $props();

	const src = $derived(logoUrl(path)!);
	let measured = $state<{ src: string; dark: boolean } | null>(null);
	const dark = $derived(tones.get(src) ?? (measured?.src === src ? measured.dark : false));

	function onload(event: Event) {
		if (tones.has(src)) return;
		let result = false;
		try {
			result = isDark(event.currentTarget as HTMLImageElement);
		} catch {
			// Canvas bloqueado (sem CORS): mostra como veio.
		}
		tones.set(src, result);
		measured = { src, dark: result };
	}
</script>

<img
	{src}
	{alt}
	{loading}
	crossorigin="anonymous"
	decoding="async"
	{onload}
	class={[className, 'drop-shadow-[0_2px_12px_rgb(0_0_0/0.45)]', dark && 'brightness-0 invert']}
/>
