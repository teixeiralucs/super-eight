<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AuthField from '$lib/components/auth/AuthField.svelte';
	import AuthHeading from '$lib/components/auth/AuthHeading.svelte';
	import FormMessage from '$lib/components/auth/FormMessage.svelte';
	import GoogleButton from '$lib/components/auth/GoogleButton.svelte';
	import SubmitButton from '$lib/components/auth/SubmitButton.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);
	const errors = $derived(form && 'errors' in form ? form.errors : undefined);
</script>

<svelte:head>
	<title>Criar conta — Super Eight</title>
</svelte:head>

<AuthHeading step="02" label="Criar conta" title="Comece sua coleção">
	Já tem conta?
	<a href={resolve('/login')} class="text-neon-cyan underline-offset-4 hover:underline">Entrar</a>
</AuthHeading>

{#if form && 'confirmEmail' in form}
	<FormMessage tone="success">
		Enviamos um link de confirmação para <strong>{form.email}</strong>. Abra seu e-mail para ativar
		a conta.
	</FormMessage>
{:else}
	{#if form && 'message' in form && form.message}
		<FormMessage>{form.message}</FormMessage>
	{/if}

	<div class="mt-8">
		<GoogleButton action="/login?/google" />
	</div>

	<div class="my-7 flex items-center gap-4 text-xs text-white/40" aria-hidden="true">
		<span class="h-px flex-1 bg-white/10"></span>ou com e-mail<span class="h-px flex-1 bg-white/10"
		></span>
	</div>

	<form
		method="POST"
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
			label="Username"
			name="username"
			prefix="@"
			autocomplete="username"
			autocapitalize="none"
			spellcheck={false}
			placeholder="cinefilo"
			required
			value={form?.username ?? ''}
			error={errors?.username?.[0]}
			hint="3 a 20 caracteres: letras minúsculas, números ou _"
		/>
		<AuthField
			label="E-mail"
			name="email"
			type="email"
			autocomplete="email"
			placeholder="voce@exemplo.com"
			required
			value={form?.email ?? ''}
			error={errors?.email?.[0]}
		/>
		<AuthField
			label="Senha"
			name="password"
			type="password"
			autocomplete="new-password"
			placeholder="••••••••"
			minlength={8}
			required
			error={errors?.password?.[0]}
			hint="Pelo menos 8 caracteres"
		/>
		<SubmitButton {submitting} label="Criar conta" busyLabel="Criando conta…" />
	</form>
{/if}
