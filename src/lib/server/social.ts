import { prisma } from '$lib/server/db';
import { notify, unnotify } from '$lib/server/notifications';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { LibraryRuleError } from '$lib/server/errors';
import { getUserLists } from '$lib/server/lists';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { getLibraryStates } from '$lib/server/search';
import { m } from '$lib/paraglide/messages';
import type { Locale } from '$lib/i18n';
import type { ProfileInput } from '$lib/schemas/social';
import type { FeedItem, PersonResult, PersonSuggestion, ProfileData } from '$lib/social/types';

// Perfis, seguir, feed e busca de pessoas (earlySetup.md §6.6).

const userChip = { username: true, name: true, avatarUrl: true } as const;

/**
 * Perfil público. Privado (de outra pessoa): só nome, números e listas públicas.
 * Anotações do diário nunca saem daqui — são privadas.
 */
export async function getProfile(
	username: string,
	viewerId: string | null,
	locale: Locale
): Promise<ProfileData | null> {
	const user = await prisma.user.findUnique({
		where: { username },
		select: {
			id: true,
			...userChip,
			bio: true,
			isPrivate: true,
			createdAt: true,
			_count: { select: { followers: true, following: true, reviews: true } }
		}
	});
	if (!user) return null;

	const isMe = viewerId === user.id;
	const restricted = user.isPrivate && !isMe;

	const [watched, isFollowing, lists] = await Promise.all([
		prisma.libraryEntry.count({ where: { userId: user.id, status: 'WATCHED' } }),
		viewerId && !isMe
			? prisma.follow
					.findUnique({
						where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
						select: { followerId: true }
					})
					.then(Boolean)
			: false,
		getUserLists(user.id, locale, { publicOnly: !isMe })
	]);

	const base = {
		user: {
			username: user.username,
			name: user.name,
			avatarUrl: user.avatarUrl,
			bio: user.bio,
			isPrivate: user.isPrivate,
			createdAt: user.createdAt
		},
		isMe,
		isFollowing,
		restricted,
		stats: {
			watched,
			reviews: user._count.reviews,
			lists: lists.length,
			followers: user._count.followers,
			following: user._count.following
		},
		lists
	};
	if (restricted) return { ...base, favorites: [], recentSessions: [], reviews: [] };

	const [favorites, sessions, reviews, artworks] = await Promise.all([
		prisma.libraryEntry.findMany({
			where: { userId: user.id, isFavorite: true },
			orderBy: { updatedAt: 'desc' },
			take: 12,
			select: { movie: { select: movieCardSelect } }
		}),
		prisma.diaryEntry.findMany({
			where: { userId: user.id },
			orderBy: [{ watchedAt: 'desc' }, { createdAt: 'desc' }],
			take: 12,
			select: {
				id: true,
				watchedAt: true,
				rating: true,
				isRewatch: true,
				movie: { select: movieCardSelect }
			}
		}),
		prisma.review.findMany({
			where: { userId: user.id },
			orderBy: { updatedAt: 'desc' },
			take: 10,
			select: {
				id: true,
				content: true,
				containsSpoilers: true,
				createdAt: true,
				updatedAt: true,
				movieId: true,
				movie: { select: movieCardSelect },
				_count: { select: { likes: true, comments: true } },
				likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false
			}
		}),
		getArtworks(user.id)
	]);

	const ratings = new Map(
		(
			await prisma.libraryEntry.findMany({
				where: { userId: user.id, movieId: { in: reviews.map((r) => r.movieId) } },
				select: { movieId: true, rating: true }
			})
		).map((entry) => [entry.movieId, entry.rating])
	);
	const favoriteIds = favorites.map((f) => f.movie.id);
	const states = viewerId ? await getLibraryStates(viewerId, favoriteIds) : null;
	const card = (row: Parameters<typeof localizeCard>[0]) =>
		withArtwork(localizeCard(row, locale), artworks);

	return {
		...base,
		favorites: favorites.map((f) => ({
			movie: card(f.movie),
			library: states?.get(f.movie.id) ?? null
		})),
		recentSessions: sessions.map((s) => ({ ...s, movie: card(s.movie) })),
		reviews: reviews.map((r) => ({
			movie: card(r.movie),
			review: {
				id: r.id,
				content: r.content,
				containsSpoilers: r.containsSpoilers,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
				rating: ratings.get(r.movieId) ?? null,
				likeCount: r._count.likes,
				commentCount: r._count.comments,
				likedByMe: Array.isArray(r.likes) && r.likes.length > 0,
				isMine: isMe
			}
		}))
	};
}

export async function follow(followerId: string, username: string) {
	const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
	if (!target) throw new LibraryRuleError(m.error_user_not_found());
	if (target.id === followerId) throw new LibraryRuleError(m.error_follow_self());
	const key = { followerId_followingId: { followerId, followingId: target.id } };
	if (await prisma.follow.findUnique({ where: key, select: { followerId: true } })) return;
	await prisma.follow.create({ data: { followerId, followingId: target.id } });
	await notify(target.id, followerId, 'FOLLOW');
}

export async function unfollow(followerId: string, username: string) {
	const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
	if (!target) return;
	await prisma.follow.deleteMany({ where: { followerId, followingId: target.id } });
	await unnotify(target.id, followerId, 'FOLLOW');
}

const FEED_LIMIT = 80;
/** Prévia da review no feed (o texto inteiro fica na aba Reviews do filme). */
const EXCERPT = 320;

/**
 * Feed (§6.6.3): sessões assistidas, reviews e listas públicas novas de quem a pessoa segue,
 * numa linha do tempo. Perfis privados ficam de fora; anotações do diário nunca aparecem.
 */
export async function getFeed(viewerId: string, locale: Locale): Promise<FeedItem[]> {
	const followed = { isPrivate: false, followers: { some: { followerId: viewerId } } };
	const [sessions, reviews, lists] = await Promise.all([
		prisma.diaryEntry.findMany({
			where: { user: followed },
			orderBy: [{ watchedAt: 'desc' }, { createdAt: 'desc' }],
			take: FEED_LIMIT,
			select: {
				id: true,
				userId: true,
				watchedAt: true,
				createdAt: true,
				rating: true,
				isRewatch: true,
				user: { select: userChip },
				movie: { select: movieCardSelect }
			}
		}),
		prisma.review.findMany({
			where: { user: followed },
			orderBy: { createdAt: 'desc' },
			take: FEED_LIMIT,
			select: {
				id: true,
				userId: true,
				movieId: true,
				content: true,
				containsSpoilers: true,
				createdAt: true,
				user: { select: userChip },
				movie: { select: movieCardSelect }
			}
		}),
		// Listas vazias ainda não dizem nada.
		prisma.list.findMany({
			where: { user: followed, isPublic: true, items: { some: {} } },
			orderBy: { createdAt: 'desc' },
			take: 30,
			select: {
				id: true,
				userId: true,
				title: true,
				description: true,
				kind: true,
				isPublic: true,
				createdAt: true,
				updatedAt: true,
				user: { select: userChip },
				_count: { select: { items: true, likes: true } },
				items: {
					orderBy: { position: 'asc' },
					take: 1,
					select: { movie: { select: movieCardSelect } }
				}
			}
		})
	]);

	// Cada imagem com o DNA visual do autor; a nota da review é a atual da biblioteca dele.
	const authors = [...new Set([...sessions, ...reviews, ...lists].map((row) => row.userId))];
	const [artworkPairs, ratings] = await Promise.all([
		Promise.all(authors.map(async (id) => [id, await getArtworks(id)] as const)),
		reviews.length
			? prisma.libraryEntry.findMany({
					where: { OR: reviews.map((r) => ({ userId: r.userId, movieId: r.movieId })) },
					select: { userId: true, movieId: true, rating: true }
				})
			: []
	]);
	const artworks = new Map(artworkPairs);
	const ratingOf = new Map(ratings.map((r) => [`${r.userId}:${r.movieId}`, r.rating]));
	const card = (row: Parameters<typeof localizeCard>[0], userId: string) =>
		withArtwork(localizeCard(row, locale), artworks.get(userId)!);

	const items: FeedItem[] = [
		...sessions.map((row) => ({
			kind: 'session' as const,
			id: row.id,
			at: row.watchedAt,
			createdAt: row.createdAt,
			rating: row.rating,
			isRewatch: row.isRewatch,
			author: row.user,
			movie: card(row.movie, row.userId)
		})),
		...reviews.map((row) => ({
			kind: 'review' as const,
			id: row.id,
			at: row.createdAt,
			createdAt: row.createdAt,
			rating: ratingOf.get(`${row.userId}:${row.movieId}`) ?? null,
			content:
				row.content.length > EXCERPT
					? `${row.content.slice(0, EXCERPT - 1).trimEnd()}…`
					: row.content,
			containsSpoilers: row.containsSpoilers,
			author: row.user,
			movie: card(row.movie, row.userId)
		})),
		...lists.map(({ _count, items, user, userId, createdAt, ...list }) => {
			const first = items[0] && card(items[0].movie, userId);
			return {
				kind: 'list' as const,
				id: list.id,
				at: createdAt,
				createdAt,
				author: user,
				list: {
					...list,
					count: _count.items,
					likeCount: _count.likes,
					owner: user,
					cover: first
						? { backdropPath: first.backdropPath, originalTitle: first.originalTitle }
						: null
				}
			};
		})
	];
	// Mais recentes primeiro; no mesmo dia, pela hora em que foi registrado.
	return items
		.sort(
			(a, b) => b.at.getTime() - a.at.getTime() || b.createdAt.getTime() - a.createdAt.getTime()
		)
		.slice(0, FEED_LIMIT);
}

/**
 * Pessoas para seguir (perfis públicos que ainda não segue), por:
 * - gosto parecido: filmes em comum na biblioteca, valendo mais quando as notas são próximas;
 * - rede: seguidas por quem a pessoa segue;
 * - sem nada disso (conta nova): as mais seguidas.
 */
export async function suggestPeople(viewerId: string, limit = 6): Promise<PersonSuggestion[]> {
	const [taste, network] = await Promise.all([
		prisma.$queryRaw<{ id: string; shared: bigint; diff: number | null }[]>`
			WITH mine AS (
				SELECT "movieId", rating FROM "LibraryEntry" WHERE "userId" = ${viewerId}::uuid
			)
			SELECT u.id, COUNT(*) AS shared, AVG(ABS(le.rating - mine.rating))::float AS diff
			FROM "LibraryEntry" le
			JOIN mine ON mine."movieId" = le."movieId"
			JOIN "User" u ON u.id = le."userId"
			WHERE u.id <> ${viewerId}::uuid AND NOT u."isPrivate"
				AND NOT EXISTS (
					SELECT 1 FROM "Follow" f
					WHERE f."followerId" = ${viewerId}::uuid AND f."followingId" = u.id
				)
			GROUP BY u.id
			ORDER BY shared DESC
			LIMIT 30`,
		prisma.$queryRaw<{ id: string; count: bigint; via: string }[]>`
			SELECT f2."followingId" AS id, COUNT(*) AS count, MIN(mid.username) AS via
			FROM "Follow" f1
			JOIN "Follow" f2 ON f2."followerId" = f1."followingId"
			JOIN "User" mid ON mid.id = f1."followingId"
			JOIN "User" u ON u.id = f2."followingId"
			WHERE f1."followerId" = ${viewerId}::uuid
				AND f2."followingId" <> ${viewerId}::uuid AND NOT u."isPrivate"
				AND NOT EXISTS (
					SELECT 1 FROM "Follow" f
					WHERE f."followerId" = ${viewerId}::uuid AND f."followingId" = f2."followingId"
				)
			GROUP BY f2."followingId"
			ORDER BY count DESC
			LIMIT 30`
	]);

	// Pontos: cada filme em comum vale 1 (até 2 com notas iguais); cada ponte na rede, 3.
	const scores = new Map<string, { score: number; reason: PersonSuggestion['reason'] }>();
	for (const row of taste) {
		const shared = Number(row.shared);
		const closeness = row.diff === null ? 1 : 1 + Math.max(0, (4 - row.diff) / 4);
		scores.set(row.id, { score: shared * closeness, reason: { kind: 'taste', shared } });
	}
	for (const row of network) {
		const count = Number(row.count);
		const current = scores.get(row.id);
		const reason = { kind: 'network' as const, via: row.via, count };
		scores.set(row.id, {
			score: (current?.score ?? 0) + count * 3,
			// O motivo exibido é o mais forte dos dois.
			reason: current && current.score >= count * 3 ? current.reason : reason
		});
	}

	const ranked: [string, PersonSuggestion['reason']][] = [...scores.entries()]
		.sort((a, b) => b[1].score - a[1].score)
		.slice(0, limit)
		.map(([id, { reason }]) => [id, reason]);

	// Completa com as pessoas mais seguidas.
	if (ranked.length < limit) {
		const popular = await prisma.user.findMany({
			where: {
				id: { notIn: [viewerId, ...ranked.map(([id]) => id)] },
				isPrivate: false,
				followers: { none: { followerId: viewerId } }
			},
			orderBy: { followers: { _count: 'desc' } },
			take: limit - ranked.length,
			select: { id: true, _count: { select: { followers: true } } }
		});
		for (const row of popular) {
			ranked.push([row.id, { kind: 'popular', followers: row._count.followers }]);
		}
	}

	const users = await prisma.user.findMany({
		where: { id: { in: ranked.map(([id]) => id) } },
		select: { id: true, ...userChip }
	});
	const byId = new Map(users.map(({ id, ...chip }) => [id, chip]));
	return ranked.flatMap(([id, reason]) => {
		const user = byId.get(id);
		return user ? [{ user, reason }] : [];
	});
}

/** Busca por @username ou nome (sem distinguir maiúsculas). */
export async function searchPeople(
	query: string,
	viewerId: string | null
): Promise<PersonResult[]> {
	const term = query.trim().replace(/^@/, '');
	if (!term) return [];
	const rows = await prisma.user.findMany({
		where: {
			OR: [
				{ username: { contains: term, mode: 'insensitive' } },
				{ name: { contains: term, mode: 'insensitive' } }
			]
		},
		orderBy: { followers: { _count: 'desc' } },
		take: 30,
		select: {
			id: true,
			...userChip,
			bio: true,
			_count: { select: { followers: true } },
			followers: viewerId
				? { where: { followerId: viewerId }, select: { followerId: true } }
				: false
		}
	});
	return rows.map((row) => ({
		username: row.username,
		name: row.name,
		avatarUrl: row.avatarUrl,
		bio: row.bio,
		followers: row._count.followers,
		isFollowing: Array.isArray(row.followers) && row.followers.length > 0,
		isMe: row.id === viewerId
	}));
}

export async function updateProfile(userId: string, input: ProfileInput) {
	await prisma.user.update({ where: { id: userId }, data: input });
}
