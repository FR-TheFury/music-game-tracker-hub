
-- Étape 1: Audit et correction de la base de données
-- Ajout des colonnes manquantes pour les statistiques de streaming

-- Ajouter les colonnes manquantes dans la table artists si elles n'existent pas déjà
ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS total_streams BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_listeners INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Mettre à jour les commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN public.artists.total_streams IS 'Nombre total de streams/écoutes cumulés sur toutes les plateformes';
COMMENT ON COLUMN public.artists.monthly_listeners IS 'Nombre d''auditeurs mensuels (principalement Spotify)';
COMMENT ON COLUMN public.artists.last_updated IS 'Dernière mise à jour des statistiques';

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_artists_total_streams ON public.artists(total_streams);
CREATE INDEX IF NOT EXISTS idx_artists_monthly_listeners ON public.artists(monthly_listeners);
CREATE INDEX IF NOT EXISTS idx_artists_last_updated ON public.artists(last_updated);

-- Corriger les données existantes en fusionnant total_plays et lifetime_plays
UPDATE public.artists 
SET total_streams = COALESCE(GREATEST(total_plays, lifetime_plays), total_plays, lifetime_plays, 0)
WHERE total_streams = 0;

-- Nettoyer les données dupliquées ou incohérentes
UPDATE public.artists 
SET 
  total_followers = COALESCE(GREATEST(total_followers, followers_count), total_followers, followers_count, 0),
  average_popularity = CASE 
    WHEN average_popularity = 0 THEN popularity 
    ELSE average_popularity 
  END
WHERE total_followers = 0 OR average_popularity = 0;

-- Créer une fonction pour calculer les statistiques agrégées
CREATE OR REPLACE FUNCTION public.calculate_artist_aggregated_stats(artist_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_followers_sum INTEGER := 0;
  total_popularity_sum INTEGER := 0;
  platform_count INTEGER := 0;
  avg_popularity INTEGER := 0;
BEGIN
  -- Calculer les statistiques à partir des platform_stats si disponibles
  SELECT 
    COALESCE(SUM((stat->>'followers')::INTEGER), 0),
    COALESCE(SUM((stat->>'popularity')::INTEGER), 0),
    COALESCE(COUNT(*), 0)
  INTO total_followers_sum, total_popularity_sum, platform_count
  FROM public.artists a,
  jsonb_array_elements(COALESCE(a.platform_stats, '[]'::jsonb)) AS stat
  WHERE a.id = artist_id;
  
  -- Calculer la popularité moyenne
  IF platform_count > 0 THEN
    avg_popularity := total_popularity_sum / platform_count;
  END IF;
  
  -- Mettre à jour l'artiste avec les statistiques calculées
  UPDATE public.artists 
  SET 
    total_followers = GREATEST(total_followers_sum, total_followers, followers_count),
    average_popularity = GREATEST(avg_popularity, average_popularity, popularity),
    last_updated = NOW()
  WHERE id = artist_id;
END;
$$;

-- Créer une fonction pour nettoyer et valider les données
CREATE OR REPLACE FUNCTION public.cleanup_artist_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Nettoyer les valeurs nulles et négatives
  UPDATE public.artists 
  SET 
    total_streams = COALESCE(total_streams, 0),
    total_followers = COALESCE(total_followers, 0),
    followers_count = COALESCE(followers_count, 0),
    popularity = COALESCE(popularity, 0),
    average_popularity = COALESCE(average_popularity, 0),
    monthly_listeners = COALESCE(monthly_listeners, 0)
  WHERE 
    total_streams IS NULL OR total_streams < 0 OR
    total_followers IS NULL OR total_followers < 0 OR
    followers_count IS NULL OR followers_count < 0 OR
    popularity IS NULL OR popularity < 0 OR
    average_popularity IS NULL OR average_popularity < 0 OR
    monthly_listeners IS NULL OR monthly_listeners < 0;
    
  -- Log du nettoyage
  RAISE NOTICE 'Artist data cleanup completed at %', NOW();
END;
$$;

-- Exécuter le nettoyage des données
SELECT public.cleanup_artist_data();
