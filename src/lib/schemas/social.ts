import { z } from 'zod';
import { m } from '$lib/paraglide/messages';

// Validação das actions da comunidade (earlySetup.md §5.2.5).

const checkbox = z.preprocess((value) => value === 'on' || value === 'true', z.boolean());

export const reviewSchema = z.object({
	content: z
		.string()
		.trim()
		.min(1, { error: () => m.error_review_empty() })
		.max(5000, { error: () => m.error_review_too_long() }),
	containsSpoilers: checkbox
});

export const reviewIdSchema = z.object({
	reviewId: z.uuid({ error: () => m.error_review_not_found() })
});

export const commentSchema = z.object({
	reviewId: z.uuid({ error: () => m.error_review_not_found() }),
	content: z
		.string()
		.trim()
		.min(1, { error: () => m.error_comment_empty() })
		.max(1000, { error: () => m.error_comment_too_long() })
});

export const commentIdSchema = z.object({
	commentId: z.uuid({ error: () => m.error_comment_not_found() })
});

export const profileSchema = z.object({
	name: z
		.string()
		.trim()
		.max(60, { error: () => m.error_name_too_long() })
		.optional()
		.transform((value) => value || null),
	bio: z
		.string()
		.trim()
		.max(300, { error: () => m.error_bio_too_long() })
		.optional()
		.transform((value) => value || null),
	isPrivate: checkbox
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
