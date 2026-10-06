import { prisma } from '$lib/server/db';
import type { Prisma } from '$lib/server/generated/prisma/client';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { groupNotifications, type NotificationKind } from '$lib/social/notifications';
import type { Locale } from '$lib/i18n';

/**
 * Notificações (earlySetup.md §6.13): criadas junto com a ação (seguir, curtir, comentar) e
 * apagadas quando ela é desfeita. Ninguém é avisado das próprias ações.
 */

const userChip = { username: true, name: true, avatarUrl: true } as const;
/** Quantas a página mostra (as mais recentes). */
const PAGE_SIZE = 100;
/** Avisos mais antigos que isto são apagados pela rotina diária. */
const KEEP_DAYS = 90;
/** Trecho do comentário mostrado no aviso. */
const EXCERPT = 160;

interface Target {
	reviewId?: string;
	listId?: string;
	commentId?: string;
}

/** Cria o aviso (sem avisar a pessoa das próprias ações). */
export async function notify(
	userId: string,
	actorId: string,
	type: NotificationKind,
	target: Target = {}
) {
	if (userId === actorId) return;
	await prisma.notification.create({ data: { userId, actorId, type, ...target } });
}

/** Apaga o aviso de uma ação desfeita (descurtir, deixar de seguir). */
export async function unnotify(
	userId: string,
	actorId: string,
	type: NotificationKind,
	target: Target = {}
) {
	await prisma.notification.deleteMany({ where: { userId, actorId, type, ...target } });
}

/**
 * Comentário novo numa review ou lista: avisa o dono dela e quem já tinha comentado ali
 * (uma vez por pessoa).
 */
export async function notifyComment(
	actorId: string,
	target: { kind: 'review' | 'list'; id: string; ownerId: string },
	commentId: string
) {
	const field = target.kind === 'review' ? 'reviewId' : 'listId';
	const previous = await prisma.comment.findMany({
		where: { [field]: target.id, userId: { notIn: [actorId, target.ownerId] } },
		distinct: ['userId'],
		select: { userId: true }
	});
	const [ownerType, replyType] =
		target.kind === 'review'
			? (['REVIEW_COMMENT', 'REVIEW_REPLY'] as const)
			: (['LIST_COMMENT', 'LIST_REPLY'] as const);
	const data: Prisma.NotificationCreateManyInput[] = [
		...(target.ownerId !== actorId ? [{ userId: target.ownerId, type: ownerType }] : []),
		...previous.map((row) => ({ userId: row.userId, type: replyType }))
	].map((row) => ({ ...row, actorId, [field]: target.id, commentId }));
	if (data.length) await prisma.notification.createMany({ data });
}

export const countUnread = (userId: string) =>
	prisma.notification.count({ where: { userId, readAt: null } });

/** Os avisos da pessoa, agrupados; abrir a página marca todos como lidos. */
export async function getNotifications(userId: string, locale: Locale) {
	const rows = await prisma.notification.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take: PAGE_SIZE,
		select: {
			id: true,
			type: true,
			readAt: true,
			createdAt: true,
			reviewId: true,
			listId: true,
			actor: { select: userChip },
			review: { select: { movie: { select: movieCardSelect } } },
			list: { select: { id: true, title: true } },
			comment: { select: { content: true } }
		}
	});
	const movieIds = rows.flatMap((row) => (row.review ? [row.review.movie.id] : []));
	const artworks = await getArtworks(userId, movieIds);

	const items = groupNotifications(
		rows.map((row) => {
			const movie = row.review
				? withArtwork(localizeCard(row.review.movie, locale), artworks)
				: null;
			const content = row.comment?.content ?? null;
			return {
				...row,
				movie: movie && { id: movie.id, title: movie.title, posterPath: movie.posterPath },
				comment:
					content && content.length > EXCERPT ? `${content.slice(0, EXCERPT).trimEnd()}…` : content
			};
		})
	);

	if (rows.some((row) => !row.readAt)) {
		await prisma.notification.updateMany({
			where: { userId, readAt: null },
			data: { readAt: new Date() }
		});
	}
	return items;
}

/** Rotina diária: apaga avisos com mais de 90 dias. */
export async function pruneNotifications() {
	const { count } = await prisma.notification.deleteMany({
		where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000) } }
	});
	return count;
}
