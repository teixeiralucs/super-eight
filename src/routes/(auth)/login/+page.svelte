<script lang="ts">
	import { m } from '$lib/paraglide/messages';
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
	<title>{m.login_page_title()}</title>
</svelte:head>

<AuthHeading step="01" label={m.auth_sign_in()} title={m.login_title()}>
	{m.login_no_account()}
	<a href={resolve('/signup')} class="text-neon-cyan underline-offset-4 hover:underline"
		>{m.auth_create_account()}</a
	>
</AuthHeading>

{#if data.callbackError}
	<FormMessage>{m.login_callback_error()}</FormMessage>
{/if}
{#if form && 'message' in form && form.message}
	<FormMessage>{form.message}</FormMessage>
{/if}

<div class="mt-8">
	<GoogleButton action={withNext('google')} />
</div>

<div class="my-7 flex items-center gap-4 text-xs text-white/40" aria-hidden="true">
	<span class="h-px flex-1 bg-white/10"></span>{m.or_with_email()}<span
		class="h-px flex-1 bg-white/10"
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
		label={m.field_email()}
		name="email"
		type="email"
		autocomplete="email"
		placeholder={m.email_placeholder()}
		required
		value={form && 'email' in form ? form.email : ''}
		error={errors?.email?.[0]}
	/>
	<AuthField
		label={m.field_password()}
		name="password"
		type="password"
		autocomplete="current-password"
		placeholder="••••••••"
		required
		error={errors?.password?.[0]}
	/>
	<SubmitButton {submitting} label={m.auth_sign_in()} busyLabel={m.signing_in()} />
</form>
