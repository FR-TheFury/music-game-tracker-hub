
-- Ajouter les colonnes pour les statistiques cumulées dans la table artists
ALTER TABLE public.artists 
ADD COLUMN total_followers INTEGER DEFAULT 0,
ADD COLUMN average_popularity INTEGER DEFAULT 0,
ADD COLUMN platform_stats JSONB DEFAULT '[]'::jsonb;

-- Ajouter des commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN public.artists.total_followers IS 'Nombre total de followers cumulés sur toutes les plateformes';
COMMENT ON COLUMN public.artists.average_popularity IS 'Score de popularité moyen pondéré sur toutes les plateformes';
COMMENT ON COLUMN public.artists.platform_stats IS 'Statistiques détaillées par plateforme (followers, popularité, etc.)';

-- Créer un index pour améliorer les performances des requêtes sur les statistiques
CREATE INDEX idx_artists_total_followers ON public.artists(total_followers);
CREATE INDEX idx_artists_average_popularity ON public.artists(average_popularity);
