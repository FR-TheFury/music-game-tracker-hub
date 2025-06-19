
-- Créer une table pour logger les emails envoyés et éviter les doublons
CREATE TABLE public.email_sent_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  release_hash TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'release_notification',
  release_title TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, release_hash, email_type)
);

-- Ajouter RLS à la table email_sent_log
ALTER TABLE public.email_sent_log ENABLE ROW LEVEL SECURITY;

-- Policy pour que les utilisateurs voient leurs propres logs
CREATE POLICY "Users can view their own email logs" 
  ON public.email_sent_log 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy pour insérer des logs (système)
CREATE POLICY "System can insert email logs" 
  ON public.email_sent_log 
  FOR INSERT 
  WITH CHECK (true);

-- Créer un index pour améliorer les performances
CREATE INDEX idx_email_sent_log_user_hash ON public.email_sent_log(user_id, release_hash);
CREATE INDEX idx_email_sent_log_sent_at ON public.email_sent_log(sent_at);

-- Ajouter une colonne unique_hash à la table new_releases pour éviter les doublons
ALTER TABLE public.new_releases 
ADD COLUMN unique_hash TEXT;

-- Créer un index unique sur le hash pour éviter les doublons
CREATE UNIQUE INDEX idx_new_releases_unique_hash ON public.new_releases(unique_hash);

-- Fonction pour nettoyer les anciens logs d'emails (plus de 30 jours)
CREATE OR REPLACE FUNCTION public.cleanup_old_email_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.email_sent_log 
  WHERE sent_at < now() - INTERVAL '30 days';
  
  RAISE NOTICE 'Cleaned up old email logs at %', now();
END;
$$;

-- Programmer le nettoyage des logs d'emails tous les jours à 3h du matin
SELECT cron.schedule(
  'cleanup-old-email-logs',
  '0 3 * * *',
  'SELECT public.cleanup_old_email_logs();'
);
