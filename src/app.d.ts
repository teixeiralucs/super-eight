import type { SupabaseClient } from '@supabase/supabase-js';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			/** Usuário autenticado (JWT verificado via getClaims) ou null. */
			user: SessionUser | null;
		}
		// interface PageData {}
		interface PageState {
			/** Detalhes abertos por cima da página atual (shallow routing). */
			movie?: import('$lib/movie/types').MovieDetailData;
		}
		// interface Platform {}
	}

	interface SessionUser {
		id: string;
		email: string | undefined;
	}
}

export {};
