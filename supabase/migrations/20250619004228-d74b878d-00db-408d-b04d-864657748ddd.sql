
-- Créer le bucket pour les avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Créer les politiques pour le bucket avatars
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar." ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar." ON storage.objects
FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);
