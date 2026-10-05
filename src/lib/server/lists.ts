import { prisma } from '$lib/server/db';
import { getArtworks, withArtwork } from '$lib/server/artwork';
import { LibraryRuleError } from '$lib/server/errors';
import { localizeCard, movieCardSelect } from '$lib/server/movie-locale';
import { ensureMovie } from '$lib/server/movies';
import { getLibraryStates } from '$lib/server/search';
import { m } from '$lib/paraglide/messages';
import type { Locale } from '$lib/i18n';
import type { ListDetail, ListMembership, ListSummary } from '$lib/lists/types';
import type { ListFields } from '$lib/schemas/lists';

// Listas personalizadas (earlySetup.md §3.6, §5.2.4). Toda mutação confere o dono.

/** Lista do usuário ou erro (nunca revela se a lista de outra pessoa existe). */
async function ownedList(userId: string, listId: string) {
	const list = await prisma.list.findFirst({ where: { id: listId, userId }, select: { id: true } });
	if (!list) throw new LibraryRuleError(m.error_list_not_found());
	return list;
}

/** Listas do usuário para a página /lists (mais recentes primeiro). */
export async function getUserLists(
	userId: string,
	locale: Locale,
	{ publicOnly = false } = {}
): Promise<ListSummary[]> {
	const [lists, artworks] = await Promise.all([
		prisma.list.findMany({
			where: { userId, ...(publicOnly && { isPublic: true }) },
			orderBy: { updatedAt: 'desc' },
			select: {
				id: true,
				title: true,
				description: true,
				kind: true,
				isPublic: true,
				updatedAt: true,
				_count: { select: { items: true, likes: true } },
				items: {
					orderBy: { position: 'asc' },
					take: 1,
					select: { movie: { select: movieCardSelect } }
				}
			}
		}),
		getArtworks(userId)
	]);

	return lists.map(({ _count, items, ...list }) => {
		const first = items[0] && withArtwork(localizeCard(items[0].movie, locale), artworks);
		return {
			...list,
			count: _count.items,
			likeCount: _count.likes,
			cover: first ? { backdropPath: first.backdropPath, originalTitle: first.originalTitle } : null
		};
	});
}

/**
 * Listas de outras pessoas que o usuário curtiu (aba Curtidas), as curtidas mais recentes
 * primeiro. Lista que virou privada some daqui (a curtida fica guardada).
 */
export async function getLikedLists(userId: string, locale: Locale): Promise<ListSummary[]> {
	const likes = await prisma.listLike.findMany({
		where: { userId, list: { isPublic: true, userId: { not: userId } } },
		orderBy: { createdAt: 'desc' },
		select: {
			list: {
				select: {
					id: true,
					userId: true,
					title: true,
					description: true,
					kind: true,
					isPublic: true,
					updatedAt: true,
					user: { select: { username: true, name: true, avatarUrl: true } },
					_count: { select: { items: true, likes: true } },
					items: {
						orderBy: { position: 'asc' },
						take: 1,
						select: { movie: { select: movieCardSelect } }
					}
				}
			}
		}
	});
	// Capa com o DNA visual de cada dono.
	const owners = [...new Set(likes.map(({ list }) => list.userId))];
	const artworks = new Map(
		await Promise.all(owners.map(async (id) => [id, await getArtworks(id)] as const))
	);
	return likes.map(({ list: { _count, items, user, userId: ownerId, ...list } }) => {
		const first =
			items[0] && withArtwork(localizeCard(items[0].movie, locale), artworks.get(ownerId)!);
		return {
			...list,
			count: _count.items,
			likeCount: _count.likes,
			owner: user,
			cover: first ? { backdropPath: first.backdropPath, originalTitle: first.originalTitle } : null
		};
	});
}

/** Curtir/descurtir uma lista pública de outra pessoa. */
export async function toggleListLike(userId: string, listId: string) {
	const list = await prisma.list.findFirst({
		where: { id: listId, isPublic: true, userId: { not: userId } },
		select: { id: true }
	});
	if (!list) throw new LibraryRuleError(m.error_list_not_found());
	const key = { userId_listId: { userId, listId } };
	const existing = await prisma.listLike.findUnique({ where: key, select: { userId: true } });
	if (existing) await prisma.listLike.delete({ where: key });
	else await prisma.listLike.create({ data: { userId, listId } });
}

/**
 * Uma lista para exibir. Privada: só o dono vê (os outros recebem `null` → 404).
 * As imagens seguem o DNA visual do dono (a lista é a curadoria dele); o estado na
 * biblioteca é o de quem está vendo.
 */
export async function getList(
	listId: string,
	viewerId: string | null,
	locale: Locale
): Promise<ListDetail | null> {
	const list = await prisma.list.findUnique({
		where: { id: listId },
		select: {
			id: true,
			userId: true,
			title: true,
			description: true,
			kind: true,
			isPublic: true,
			user: { select: { username: true, name: true } },
			_count: { select: { likes: true } },
			likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
			items: {
				orderBy: { position: 'asc' },
				select: { position: true, addedAt: true, movie: { select: movieCardSelect } }
			}
		}
	});
	const isOwner = Boolean(viewerId && list?.userId === viewerId);
	if (!list || (!list.isPublic && !isOwner)) return null;

	const movieIds = list.items.map((item) => item.movie.id);
	const [artworks, states] = await Promise.all([
		getArtworks(list.userId, movieIds),
		viewerId ? getLibraryStates(viewerId, movieIds) : null
	]);

	return {
		id: list.id,
		title: list.title,
		description: list.description,
		kind: list.kind,
		isPublic: list.isPublic,
		owner: list.user,
		isOwner,
		likeCount: list._count.likes,
		likedByMe: Array.isArray(list.likes) && list.likes.length > 0,
		items: list.items.map((item) => ({
			position: item.position,
			addedAt: item.addedAt,
			movie: withArtwork(localizeCard(item.movie, locale), artworks),
			library: states?.get(item.movie.id) ?? null
		}))
	};
}

/** Listas do usuário com a marcação de quais já têm o filme (pop-up dos detalhes). */
export async function getListMemberships(
	userId: string,
	movieId: number
): Promise<ListMembership[]> {
	const lists = await prisma.list.findMany({
		where: { userId },
		orderBy: { updatedAt: 'desc' },
		select: {
			id: true,
			title: true,
			kind: true,
			isPublic: true,
			_count: { select: { items: true } },
			items: { where: { movieId }, select: { movieId: true } }
		}
	});
	return lists.map(({ _count, items, ...list }) => ({
		...list,
		count: _count.items,
		contains: items.length > 0
	}));
}

export async function createList(userId: string, fields: ListFields) {
	return prisma.list.create({ data: { userId, ...fields }, select: { id: true } });
}

export async function updateList(userId: string, listId: string, fields: ListFields) {
	await ownedList(userId, listId);
	await prisma.list.update({ where: { id: listId }, data: fields });
}

export async function deleteList(userId: string, listId: string) {
	await ownedList(userId, listId);
	await prisma.list.delete({ where: { id: listId } });
}

/** Adiciona no fim da lista (§5.2.4: posição = última + 1). Já presente: nada muda. */
export async function addToList(
	userId: string,
	listId: string,
	movieId: number,
	fetchFn?: typeof fetch
) {
	await ownedList(userId, listId);
	await ensureMovie(movieId, fetchFn);
	await prisma.$transaction(async (tx) => {
		const exists = await tx.listMovie.findUnique({
			where: { listId_movieId: { listId, movieId } },
			select: { movieId: true }
		});
		if (exists) return;
		const last = await tx.listMovie.aggregate({ where: { listId }, _max: { position: true } });
		await tx.listMovie.create({
			data: { listId, movieId, position: (last._max.position ?? 0) + 1 }
		});
		await tx.list.update({ where: { id: listId }, data: { updatedAt: new Date() } });
	});
}

/** Remove e fecha o buraco na numeração (rankings continuam 1, 2, 3…). */
export async function removeFromList(userId: string, listId: string, movieId: number) {
	await ownedList(userId, listId);
	await prisma.$transaction(async (tx) => {
		const removed = await tx.listMovie.deleteMany({ where: { listId, movieId } });
		if (!removed.count) return;
		const rest = await tx.listMovie.findMany({
			where: { listId },
			orderBy: { position: 'asc' },
			select: { movieId: true }
		});
		await Promise.all(
			rest.map((item, i) =>
				tx.listMovie.update({
					where: { listId_movieId: { listId, movieId: item.movieId } },
					data: { position: i + 1 }
				})
			)
		);
		await tx.list.update({ where: { id: listId }, data: { updatedAt: new Date() } });
	});
}

/** Liga/desliga o filme na lista (pop-up dos detalhes). */
export async function toggleInList(
	userId: string,
	listId: string,
	movieId: number,
	fetchFn?: typeof fetch
) {
	const inList = await prisma.listMovie.findUnique({
		where: { listId_movieId: { listId, movieId } },
		select: { movieId: true }
	});
	if (inList) await removeFromList(userId, listId, movieId);
	else await addToList(userId, listId, movieId, fetchFn);
}

/** Nova ordem do ranking: precisa conter exatamente os filmes da lista. */
export async function reorderList(userId: string, listId: string, order: number[]) {
	await ownedList(userId, listId);
	const current = await prisma.listMovie.findMany({ where: { listId }, select: { movieId: true } });
	const same =
		order.length === current.length &&
		new Set(order).size === order.length &&
		current.every((item) => order.includes(item.movieId));
	if (!same) throw new LibraryRuleError(m.error_invalid_data());

	await prisma.$transaction([
		...order.map((movieId, i) =>
			prisma.listMovie.update({
				where: { listId_movieId: { listId, movieId } },
				data: { position: i + 1 }
			})
		),
		prisma.list.update({ where: { id: listId }, data: { updatedAt: new Date() } })
	]);
}
