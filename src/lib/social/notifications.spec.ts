import { describe, expect, it } from 'vitest';
import { groupNotifications, type NotificationRow } from './notifications';

const actor = (username: string) => ({ username, name: null, avatarUrl: null });
let seq = 0;
const row = (
	type: NotificationRow['type'],
	username: string,
	extra: Partial<NotificationRow> = {}
): NotificationRow => ({
	id: `n${++seq}`,
	type,
	actor: actor(username),
	readAt: new Date(),
	createdAt: new Date(Date.UTC(2026, 9, 6, 12, 0, 60 - seq)),
	reviewId: null,
	listId: null,
	movie: null,
	list: null,
	comment: null,
	...extra
});

describe('groupNotifications', () => {
	it('agrupa curtidas no mesmo alvo na posição da mais recente', () => {
		const items = groupNotifications([
			row('REVIEW_LIKE', 'ana', { reviewId: 'r1', readAt: null }),
			row('FOLLOW', 'bia'),
			row('REVIEW_LIKE', 'caio', { reviewId: 'r1' }),
			row('REVIEW_LIKE', 'ana', { reviewId: 'r1' }),
			row('LIST_LIKE', 'caio', { listId: 'l1' }),
			row('REVIEW_LIKE', 'dani', { reviewId: 'r2' })
		]);
		expect(items.map((item) => [item.type, item.actors.map((a) => a.username)])).toEqual([
			['REVIEW_LIKE', ['ana', 'caio']],
			['FOLLOW', ['bia']],
			['LIST_LIKE', ['caio']],
			['REVIEW_LIKE', ['dani']]
		]);
		expect(items[0].unread).toBe(true);
		expect(items[1].unread).toBe(false);
	});

	it('comentários e seguidores ficam um por um', () => {
		const items = groupNotifications([
			row('REVIEW_COMMENT', 'ana', { reviewId: 'r1', comment: 'a' }),
			row('REVIEW_COMMENT', 'bia', { reviewId: 'r1', comment: 'b' }),
			row('FOLLOW', 'caio'),
			row('FOLLOW', 'dani')
		]);
		expect(items).toHaveLength(4);
	});
});
