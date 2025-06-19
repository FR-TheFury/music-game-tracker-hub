
-- Ajouter les colonnes pour suivre le statut de sortie des jeux
ALTER TABLE public.games 
ADD COLUMN release_status TEXT DEFAULT 'unknown',
ADD COLUMN expected_release_date DATE,
ADD COLUMN last_status_check TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Créer un index pour améliorer les performances des requêtes sur le statut
CREATE INDEX idx_games_release_status ON public.games(release_status);
CREATE INDEX idx_games_expected_release_date ON public.games(expected_release_date);

-- Ajouter un commentaire pour documenter les valeurs possibles du statut
COMMENT ON COLUMN public.games.release_status IS 'Statut de sortie: released, coming_soon, early_access, unknown';
