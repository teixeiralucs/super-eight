import { prisma } from '$lib/server/db';
import { notify, notifyComment, unnotify } from '$lib/server/notifications';
import { LibraryRuleError } from '$lib/server/errors';
import { ensureMovie } from '$lib/server/movies';
import { m } from '$lib/paraglide/messages';
import type { ReviewInput } from '$lib/schemas/social';
import type { CommentView, MovieReviews, ReviewView } from '$lib/social/types';

// Reviews, curtidas e comentários (earlySetup.md §3.8, §5.2.5, §6.6).
// Perfis privados ficam de fora para os outros (só o próprio autor vê a sua).

const userChip = { username: true, name: true, avatarUrl: true } as const;

/** Reviews de um filme: a de quem vê à parte; as outras de quem ele segue primeiro, depois as mais curtidas. */
export async function getMovieReviews(
	movieId: number,
	viewerId: string | null
): Promise<MovieReviews> {
	const [rows, followed] = await Promise.all([
		prisma.review.findMany({
			where: {
				movieId,
				OR: [{ user: { isPrivate: false } }, ...(viewerId ? [{ userId: viewerId }] : [])]
			},
			orderBy: { createdAt: 'desc' },
			take: 200,
			select: {
				id: true,
				userId: true,
				content: true,
				containsSpoilers: true,
				createdAt: true,
				updatedAt: true,
				user: {
					select: { ...userChip, library: { where: { movieId }, select: { rating: true } } }
				},
				_count: { select: { likes: true, comments: true } },
				likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false
			}
		}),
		viewerId
			? prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } })
			: []
	]);

	const following = new Set(followed.map((f) => f.followingId));
	const views = rows.map((row): ReviewView => ({
		id: row.id,
		content: row.content,
		containsSpoilers: row.containsSpoilers,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		author: { username: row.user.username, name: row.user.name, avatarUrl: row.user.avatarUrl },
		rating: row.user.library[0]?.rating ?? null,
		likeCount: row._count.likes,
		commentCount: row._count.comments,
		likedByMe: Array.isArray(row.likes) && row.likes.length > 0,
		isMine: row.userId === viewerId,
		followed: following.has(row.userId)
	}));

	const others = views
		.filter((view) => !view.isMine)
		.sort(
			(a, b) =>
				Number(b.followed) - Number(a.followed) ||
				b.likeCount - a.likeCount ||
				b.createdAt.getTime() - a.createdAt.getTime()
		);
	return { mine: views.find((view) => view.isMine) ?? null, others };
}

/** Uma review por pessoa por filme: cria ou atualiza. */
export async function upsertReview(
	userId: string,
	movieId: number,
	input: ReviewInput,
	fetchFn?: typeof fetch
) {
	await ensureMovie(movieId, fetchFn);
	await prisma.review.upsert({
		where: { userId_movieId: { userId, movieId } },
		create: { userId, movieId, ...input },
		update: input
	});
}

export async function deleteReview(userId: string, movieId: number) {
	await prisma.review.deleteMany({ where: { userId, movieId } });
}

/** Review visível para quem vê (respeita perfil privado) ou erro. */
async function visibleReview(reviewId: string, viewerId: string) {
	const review = await prisma.review.findFirst({
		where: { id: reviewId, OR: [{ user: { isPrivate: false } }, { userId: viewerId }] },
		select: { id: true, userId: true }
	});
	if (!review) throw new LibraryRuleError(m.error_review_not_found());
	return review;
}

/** Curtir/descurtir (não dá para curtir a própria review). */
export async function toggleReviewLike(userId: string, reviewId: string) {
	const review = await visibleReview(reviewId, userId);
	if (review.userId === userId) throw new LibraryRuleError(m.error_like_own_review());
	const key = { userId_reviewId: { userId, reviewId } };
	const liked = await prisma.reviewLike.findUnique({ where: key, select: { userId: true } });
	if (liked) {
		await prisma.reviewLike.delete({ where: key });
		await unnotify(review.userId, userId, 'REVIEW_LIKE', { reviewId });
	} else {
		await prisma.reviewLike.create({ data: { userId, reviewId } });
		await notify(review.userId, userId, 'REVIEW_LIKE', { reviewId });
	}
}

export async function getComments(
	reviewId: string,
	viewerId: string | null
): Promise<CommentView[]> {
	const review = await prisma.review.findFirst({
		where: {
			id: reviewId,
			OR: [{ user: { isPrivate: false } }, ...(viewerId ? [{ userId: viewerId }] : [])]
		},
		select: { userId: true }
	});
	if (!review) return [];
	const rows = await prisma.comment.findMany({
		where: { reviewId },
		orderBy: { createdAt: 'asc' },
		take: 200,
		select: { id: true, userId: true, content: true, createdAt: true, user: { select: userChip } }
	});
	return rows.map((row) => ({
		id: row.id,
		content: row.content,
		createdAt: row.createdAt,
		author: row.user,
		canDelete: Boolean(viewerId && (row.userId === viewerId || review.userId === viewerId))
	}));
}

export async function addComment(userId: string, reviewId: string, content: string) {
	const review = await visibleReview(reviewId, userId);
	const comment = await prisma.comment.create({
		data: { userId, reviewId, content },
		select: { id: true }
	});
	await notifyComment(
		userId,
		{ kind: 'review', id: review.id, ownerId: review.userId },
		comment.id
	);
}

/** Apaga o comentário: quem escreveu ou o dono da review/lista em que ele está. */
export async function deleteComment(userId: string, commentId: string) {
	const { count } = await prisma.comment.deleteMany({
		where: { id: commentId, OR: [{ userId }, { review: { userId } }, { list: { userId } }] }
	});
	if (!count) throw new LibraryRuleError(m.error_comment_not_found());
}
