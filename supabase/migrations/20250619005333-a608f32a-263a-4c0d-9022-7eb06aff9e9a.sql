
-- Activer les extensions nécessaires pour les cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer un cron job qui vérifie les nouvelles sorties toutes les heures
SELECT cron.schedule(
  'check-new-releases-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT
    net.http_post(
        url:='https://nhezquxskhvlunqceyuc.supabase.co/functions/v1/check-new-releases',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oZXpxdXhza2h2bHVucWNleXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNTc4MzYsImV4cCI6MjA2NTgzMzgzNn0.ZG27wjX65Yui5wnxZb6eDi8H80ZqQ3Y4fweTnJrktCM"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Créer un cron job quotidien pour le nettoyage des anciennes sorties
SELECT cron.schedule(
  'cleanup-expired-releases',
  '0 2 * * *', -- Tous les jours à 2h du matin
  $$
  SELECT public.cleanup_expired_releases();
  $$
);
