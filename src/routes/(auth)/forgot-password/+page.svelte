<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import AuthField from '$lib/components/auth/AuthField.svelte';
	import AuthHeading from '$lib/components/auth/AuthHeading.svelte';
	import FormMessage from '$lib/components/auth/FormMessage.svelte';
	import SubmitButton from '$lib/components/auth/SubmitButton.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
	const errors = $derived(form && 'errors' in form ? form.errors : undefined);
	const sent = $derived(form && 'sent' in form ? form.email : null);
</script>

<svelte:head>
	<title>{m.forgot_page_title()}</title>
</svelte:head>

<AuthHeading step="01" label={m.forgot_label()} title={m.forgot_title()}>
	{m.forgot_intro()}
</AuthHeading>

{#if data.expired && !form}
	<FormMessage>{m.reset_link_invalid()}</FormMessage>
{/if}
{#if form && 'message' in form && form.message}
	<FormMessage>{form.message}</FormMessage>
{/if}
{#if sent}
	<FormMessage tone="success">{m.forgot_sent({ email: sent })}</FormMessage>
{/if}

<form
	method="POST"
	class="mt-8 flex flex-col gap-6"
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
	<SubmitButton {submitting} label={m.forgot_submit()} busyLabel={m.forgot_sending()} />
</form>

<a
	href={resolve('/login')}
	class="mt-8 inline-flex items-center gap-1.5 self-start text-sm text-white/60 transition hover:text-white"
>
	<ArrowLeftIcon class="size-4" aria-hidden="true" />
	{m.forgot_back_to_login()}
</a>
