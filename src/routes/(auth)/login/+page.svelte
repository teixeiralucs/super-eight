<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AuthField from '$lib/components/auth/AuthField.svelte';
	import AuthHeading from '$lib/components/auth/AuthHeading.svelte';
	import FormMessage from '$lib/components/auth/FormMessage.svelte';
	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';
	import SubmitButton from '$lib/components/auth/SubmitButton.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
	const next = $derived(page.url.searchParams.get('next'));
	const withNext = (action: string) =>
		next ? `?/${action}&next=${encodeURIComponent(next)}` : `?/${action}`;
	const errors = $derived(form && 'errors' in form ? form.errors : undefined);
</script>

<svelte:head>
	<title>Entrar — Super Eight</title>
</svelte:head>

<AuthHeading step="01" label="Entrar" title="Bem-vindo de volta">
	Não tem conta?
	<a href={resolve('/signup')} class="text-neon-cyan underline-offset-4 hover:underline"
		>Criar conta</a
	>
</AuthHeading>

{#if data.callbackError}
	<FormMessage>Não foi possível concluir o login. Tente novamente.</FormMessage>
{/if}
{#if form && 'message' in form && form.message}
	<FormMessage>{form.message}</FormMessage>
{/if}

<div class="mt-8">
	<GoogleButton action={withNext('google')} />
</div>

<div class="my-7 flex items-center gap-4 text-xs text-white/40" aria-hidden="true">
	<span class="h-px flex-1 bg-white/10"></span>ou com e-mail<span class="h-px flex-1 bg-white/10"
	></span>
</div>

<form
	method="POST"
	action={withNext('login')}
	class="flex flex-col gap-6"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<AuthField
		label="E-mail"
		name="email"
		type="email"
		autocomplete="email"
		placeholder="voce@exemplo.com"
		required
		value={form && 'email' in form ? form.email : ''}
		error={errors?.email?.[0]}
	/>
	<AuthField
		label="Senha"
		name="password"
		type="password"
		autocomplete="current-password"
		placeholder="••••••••"
		required
		error={errors?.password?.[0]}
	/>
	<SubmitButton {submitting} label="Entrar" busyLabel="Entrando…" />
</form>
