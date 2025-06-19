
-- Ajouter les colonnes rawg_url et shop_url à la table games
ALTER TABLE public.games 
ADD COLUMN rawg_url TEXT,
ADD COLUMN shop_url TEXT;
