
-- Modifier la table artists pour supporter plus d'informations
ALTER TABLE public.artists 
ADD COLUMN spotify_id TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN genres TEXT[], 
ADD COLUMN popularity INTEGER,
ADD COLUMN followers_count INTEGER,
ADD COLUMN multiple_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN profile_image_url TEXT;

-- Créer une table pour stocker les sorties d'artistes
CREATE TABLE public.artist_releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  spotify_id TEXT NOT NULL,
  name TEXT NOT NULL,
  release_type TEXT NOT NULL, -- 'album', 'single', 'compilation'
  release_date DATE,
  image_url TEXT,
  external_urls JSONB DEFAULT '{}'::jsonb,
  total_tracks INTEGER,
  popularity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS pour la nouvelle table
ALTER TABLE public.artist_releases ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour artist_releases
CREATE POLICY "Users can view releases of their artists" 
  ON public.artist_releases FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE artists.id = artist_releases.artist_id 
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create releases for their artists" 
  ON public.artist_releases FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE artists.id = artist_releases.artist_id 
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update releases of their artists" 
  ON public.artist_releases FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE artists.id = artist_releases.artist_id 
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete releases of their artists" 
  ON public.artist_releases FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE artists.id = artist_releases.artist_id 
      AND artists.user_id = auth.uid()
    )
  );

-- Créer des index pour améliorer les performances
CREATE INDEX idx_artist_releases_artist_id ON public.artist_releases(artist_id);
CREATE INDEX idx_artist_releases_spotify_id ON public.artist_releases(spotify_id);
CREATE INDEX idx_artist_releases_release_date ON public.artist_releases(release_date);
CREATE INDEX idx_artists_spotify_id ON public.artists(spotify_id);
