import type { SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '$lib/server/db';
import { LibraryRuleError } from '$lib/server/errors';
import { m } from '$lib/paraglide/messages';

/**
 * Foto de perfil (earlySetup.md §6.6.6) no bucket público `avatars` do Supabase Storage. O
 * envio usa o cliente com a sessão do usuário: as políticas do bucket só deixam cada pessoa
 * mexer na própria pasta (`<id>/...`).
 */

const BUCKET = 'avatars';
export const AVATAR_MAX_BYTES = 512 * 1024;

/** Tipo pelo conteúdo (não pelo que o navegador diz): WebP, PNG ou JPEG. */
function imageType(bytes: Uint8Array) {
	const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
	if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
	if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return { mime: 'image/png', ext: 'png' };
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return { mime: 'image/jpeg', ext: 'jpg' };
	}
	return null;
}

/** Apaga as fotos da pasta do usuário (menos `keep`). */
async function clearFolder(supabase: SupabaseClient, userId: string, keep?: string) {
	const { data } = await supabase.storage.from(BUCKET).list(userId);
	const old = (data ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keep);
	if (old.length) await supabase.storage.from(BUCKET).remove(old);
}

/**
 * Grava a nova foto e aponta o perfil para ela. Nome com data: a URL muda a cada troca, então
 * nenhum cache mostra a foto antiga.
 */
export async function uploadAvatar(supabase: SupabaseClient, userId: string, file: File) {
	if (!file.size) throw new LibraryRuleError(m.error_avatar_invalid());
	if (file.size > AVATAR_MAX_BYTES) throw new LibraryRuleError(m.error_avatar_too_big());
	const bytes = new Uint8Array(await file.arrayBuffer());
	const type = imageType(bytes);
	if (!type) throw new LibraryRuleError(m.error_avatar_invalid());

	const path = `${userId}/avatar-${Date.now()}.${type.ext}`;
	const { error } = await supabase.storage
		.from(BUCKET)
		.upload(path, bytes, { contentType: type.mime, cacheControl: '31536000', upsert: false });
	if (error) {
		console.error('[avatar] envio falhou:', error.message);
		throw new LibraryRuleError(m.error_avatar_upload());
	}

	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
	await prisma.user.update({ where: { id: userId }, data: { avatarUrl: data.publicUrl } });
	// A foto anterior não serve mais; se falhar, só sobra um arquivo órfão.
	await clearFolder(supabase, userId, path).catch((err) =>
		console.error('[avatar] limpeza falhou:', String(err))
	);
	return data.publicUrl;
}

/** Remove a foto: volta a inicial sobre o degradê. */
export async function removeAvatar(supabase: SupabaseClient, userId: string) {
	await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
	await clearFolder(supabase, userId).catch((err) =>
		console.error('[avatar] limpeza falhou:', String(err))
	);
}
