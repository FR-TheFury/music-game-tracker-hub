
-- Mise à jour des politiques RLS pour permettre aux viewers de voir les données

-- Politique pour les artistes - permettre aux viewers de voir tous les artistes
DROP POLICY IF EXISTS "Users can view their own artists or admins/editors can view all" ON public.artists;
CREATE POLICY "Users can view artists based on role" 
  ON public.artists FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'viewer')
  );

-- Politique pour les jeux - permettre aux viewers de voir tous les jeux
DROP POLICY IF EXISTS "Users can view their own games or admins/editors can view all" ON public.games;
CREATE POLICY "Users can view games based on role" 
  ON public.games FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'viewer')
  );

-- Politique pour les nouvelles sorties - permettre aux viewers de voir toutes les sorties
DROP POLICY IF EXISTS "Users can view their own releases" ON public.new_releases;
CREATE POLICY "Users can view releases based on role" 
  ON public.new_releases FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'viewer')
  );

-- Politique pour les sorties d'artistes - permettre aux viewers de voir toutes les sorties
DROP POLICY IF EXISTS "Users can view their own artist releases" ON public.artist_releases;
CREATE POLICY "Users can view artist releases based on role" 
  ON public.artist_releases FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE artists.id = artist_releases.artist_id 
      AND (
        artists.user_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor') OR
        public.has_role(auth.uid(), 'viewer')
      )
    )
  );

-- S'assurer que les politiques INSERT/UPDATE/DELETE restent restrictives pour les viewers
-- Les viewers peuvent seulement voir, pas modifier

-- Confirmer que seuls admin/editor peuvent créer des artistes
DROP POLICY IF EXISTS "Editors and admins can create artists" ON public.artists;
CREATE POLICY "Only admins and editors can create artists" 
  ON public.artists FOR INSERT 
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

-- Confirmer que seuls admin/editor peuvent créer des jeux
DROP POLICY IF EXISTS "Editors and admins can create games" ON public.games;
CREATE POLICY "Only admins and editors can create games" 
  ON public.games FOR INSERT 
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );
