import { z } from 'zod';
import { m } from '$lib/paraglide/messages';

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const email = z.email({ error: () => m.error_invalid_email() });

export const loginSchema = z.object({
	email,
	password: z.string().min(1, { error: () => m.error_password_required() })
});

export const signupSchema = z.object({
	email,
	password: z.string().min(8, { error: () => m.error_password_short() }),
	username: z
		.string()
		.trim()
		.toLowerCase()
		.regex(USERNAME_PATTERN, {
			error: () => m.error_username_format()
		})
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
	.object({
		password: z.string().min(8, { error: () => m.error_password_short() }),
		confirm: z.string()
	})
	.refine((value) => value.password === value.confirm, {
		path: ['confirm'],
		error: () => m.error_passwords_differ()
	});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
