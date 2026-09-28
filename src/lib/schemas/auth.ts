import { z } from 'zod';

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const email = z.email({ error: 'E-mail inválido.' });

export const loginSchema = z.object({
	email,
	password: z.string().min(1, { error: 'Informe sua senha.' })
});

export const signupSchema = z.object({
	email,
	password: z.string().min(8, { error: 'A senha precisa ter pelo menos 8 caracteres.' }),
	username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN, {
		error: 'Use de 3 a 20 caracteres: letras minúsculas, números ou _.'
	})
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
