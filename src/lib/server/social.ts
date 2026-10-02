import { prisma } from '$lib/server/db';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { LibraryRuleError } from '$lib/server/errors';
import { getUserLists } from '$lib/server/lists';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { getLibraryStates } from '$lib/server/search';
import { m } from '$lib/paraglide/messages';
import type { Locale } from '$lib/i18n';
import type { ProfileInput } from '$lib/schemas/social';
import type { FeedItem, PersonResult, ProfileData } from '$lib/social/types';

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
	await prisma.follow.upsert({
		where: { followerId_followingId: { followerId, followingId: target.id } },
		create: { followerId, followingId: target.id },
		update: {}
	});
}

export async function unfollow(followerId: string, username: string) {
	await prisma.follow.deleteMany({ where: { followerId, following: { username } } });
}

const FEED_LIMIT = 80;

/** Sessões de quem a pessoa segue (perfis privados ficam de fora; anotações nunca aparecem). */
export async function getFeed(viewerId: string, locale: Locale): Promise<FeedItem[]> {
	const rows = await prisma.diaryEntry.findMany({
		where: { user: { isPrivate: false, followers: { some: { followerId: viewerId } } } },
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
	});

	// Cada pôster com o DNA visual de quem assistiu.
	const authors = [...new Set(rows.map((row) => row.userId))];
	const artworks = new Map(
		await Promise.all(authors.map(async (id) => [id, await getArtworks(id)] as const))
	);
	return rows.map((row) => ({
		id: row.id,
		watchedAt: row.watchedAt,
		createdAt: row.createdAt,
		rating: row.rating,
		isRewatch: row.isRewatch,
		author: row.user,
		movie: withArtwork(localizeCard(row.movie, locale), artworks.get(row.userId)!)
	}));
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
