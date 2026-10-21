<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Toasts do app (earlySetup.md §6.4.3/§6.4.8, inspirado no "Animated Toast Stack" da beUI):
	 * pilha do svelte-sonner (arrastar para fechar, expande ao passar o mouse) com superfície de
	 * vidro, entrada com mola e ícones animados — o ✓ se desenha, o × treme, o carregamento gira.
	 * Um toast "Salvando…" vira o de sucesso/erro no mesmo lugar (ver $lib/feedback/submit).
	 */
</script>

{#snippet successIcon()}
	<svg viewBox="0 0 24 24" class="toast-icon toast-icon-success" aria-hidden="true">
		<circle cx="12" cy="12" r="10" />
		<path d="m7.5 12.5 3 3 6-6.5" />
	</svg>
{/snippet}

{#snippet errorIcon()}
	<svg viewBox="0 0 24 24" class="toast-icon toast-icon-error" aria-hidden="true">
		<circle cx="12" cy="12" r="10" />
		<path d="m9 9 6 6m0-6-6 6" />
	</svg>
{/snippet}

{#snippet loadingIcon()}
	<svg viewBox="0 0 24 24" class="toast-icon toast-icon-loading" aria-hidden="true">
		<circle cx="12" cy="12" r="9" />
	</svg>
{/snippet}

<Toaster
	theme="dark"
	position="top-center"
	closeButton
	closeButtonAriaLabel={m.toast_close()}
	toastOptions={{ classes: { toast: 'super-eight-toast' } }}
	{successIcon}
	{errorIcon}
	{loadingIcon}
/>
