
-- Ajouter la colonne deezer_id à la table artists
ALTER TABLE public.artists 
ADD COLUMN deezer_id INTEGER;

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX idx_artists_deezer_id ON public.artists(deezer_id);
