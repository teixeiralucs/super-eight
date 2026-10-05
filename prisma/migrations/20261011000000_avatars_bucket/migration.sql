-- Fotos de perfil no Supabase Storage (earlySetup.md §6.6.6).
-- Bucket público (as fotos aparecem para qualquer pessoa), até 512 KB, só imagens. O app
-- reduz e corta a foto no navegador (256×256 WebP) antes de enviar.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 524288, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Cada pessoa só grava, troca e apaga arquivos na própria pasta: avatars/<id do usuário>/...
-- (o servidor envia com a sessão do usuário, então `auth.uid()` é quem está logado).
CREATE POLICY "avatars: dono envia" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars: dono troca" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars: dono apaga" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Listar a própria pasta (para apagar a foto anterior).
CREATE POLICY "avatars: dono lista" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
