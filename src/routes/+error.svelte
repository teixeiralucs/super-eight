<script lang="ts">
	import Logo from '$lib/components/brand/Logo.svelte';
	import ErrorView from '$lib/components/feedback/ErrorView.svelte';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
</script>

<!-- Erros fora da área logada (ou antes do layout dela): logo + a mesma página de erro. -->
<header class="px-5 pt-6 md:px-10">
	<a href={resolve('/')} aria-label={m.nav_home()}><Logo class="h-9 w-auto" /></a>
</header>
<ErrorView home="/" />
