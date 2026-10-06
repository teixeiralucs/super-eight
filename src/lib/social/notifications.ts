import type { UserChip } from './types';

// Notificações (earlySetup.md §6.13): agrupamento puro, testável.

export type NotificationKind =
	| 'FOLLOW'
	| 'REVIEW_LIKE'
	| 'LIST_LIKE'
	| 'REVIEW_COMMENT'
	| 'REVIEW_REPLY'
	| 'LIST_COMMENT'
	| 'LIST_REPLY';

export interface NotificationRow {
	id: string;
	type: NotificationKind;
	actor: UserChip;
	readAt: Date | null;
	createdAt: Date;
	reviewId: string | null;
	listId: string | null;
	movie: { id: number; title: string; posterPath: string | null } | null;
	list: { id: string; title: string } | null;
	comment: string | null;
}

export interface NotificationItem {
	id: string;
	type: NotificationKind;
	/** Quem fez, do mais recente ao mais antigo (sem repetir). */
	actors: UserChip[];
	createdAt: Date;
	unread: boolean;
	movie: NotificationRow['movie'];
	list: NotificationRow['list'];
	comment: string | null;
}

/**
 * Curtidas no mesmo alvo viram um item só ("Ana e mais 2 curtiram…"), na posição da mais
 * recente; seguir e comentar ficam um por um. `rows` vem do mais recente ao mais antigo.
 */
export function groupNotifications(rows: NotificationRow[]): NotificationItem[] {
	const items: NotificationItem[] = [];
	const groups = new Map<string, NotificationItem>();
	for (const row of rows) {
		const target =
			row.type === 'REVIEW_LIKE' ? row.reviewId : row.type === 'LIST_LIKE' ? row.listId : null;
		const key = target ? `${row.type}:${target}` : null;
		const group = key ? groups.get(key) : undefined;
		if (group) {
			if (!group.actors.some((actor) => actor.username === row.actor.username)) {
				group.actors.push(row.actor);
			}
			group.unread ||= !row.readAt;
			continue;
		}
		const item: NotificationItem = {
			id: row.id,
			type: row.type,
			actors: [row.actor],
			createdAt: row.createdAt,
			unread: !row.readAt,
			movie: row.movie,
			list: row.list,
			comment: row.comment
		};
		items.push(item);
		if (key) groups.set(key, item);
	}
	return items;
}
