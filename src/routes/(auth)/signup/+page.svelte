<script lang="ts">
	import { m } from '$lib/paraglide/messages';
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
	<title>{m.signup_page_title()}</title>
</svelte:head>

<AuthHeading step="02" label={m.auth_create_account()} title={m.signup_title()}>
	{m.signup_have_account()}
	<a href={resolve('/login')} class="text-neon-cyan underline-offset-4 hover:underline"
		>{m.auth_sign_in()}</a
	>
</AuthHeading>

{#if form && 'confirmEmail' in form}
	<FormMessage tone="success">
		{m.confirm_email_before()} <strong>{form.email}</strong>. {m.confirm_email_after()}
	</FormMessage>
{:else}
	{#if form && 'message' in form && form.message}
		<FormMessage>{form.message}</FormMessage>
	{/if}

	<div class="mt-8">
		<GoogleButton action="/login?/google" />
	</div>

	<div class="my-7 flex items-center gap-4 text-xs text-white/40" aria-hidden="true">
		<span class="h-px flex-1 bg-white/10"></span>{m.or_with_email()}<span
			class="h-px flex-1 bg-white/10"
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
			label={m.field_username()}
			name="username"
			prefix="@"
			autocomplete="username"
			autocapitalize="none"
			spellcheck={false}
			placeholder={m.username_placeholder()}
			required
			value={form?.username ?? ''}
			error={errors?.username?.[0]}
			hint={m.username_hint()}
		/>
		<AuthField
			label={m.field_email()}
			name="email"
			type="email"
			autocomplete="email"
			placeholder={m.email_placeholder()}
			required
			value={form?.email ?? ''}
			error={errors?.email?.[0]}
		/>
		<AuthField
			label={m.field_password()}
			name="password"
			type="password"
			autocomplete="new-password"
			placeholder="••••••••"
			minlength={8}
			required
			error={errors?.password?.[0]}
			hint={m.password_hint()}
		/>
		<SubmitButton {submitting} label={m.auth_create_account()} busyLabel={m.creating_account()} />
	</form>
{/if}
