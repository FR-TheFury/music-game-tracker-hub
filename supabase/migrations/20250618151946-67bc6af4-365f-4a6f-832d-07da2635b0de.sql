
-- Create enum for notification types
CREATE TYPE notification_type AS ENUM ('artist', 'game');

-- Create table for storing new releases detected automatically
CREATE TABLE public.new_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type notification_type NOT NULL,
  source_item_id UUID NOT NULL, -- References artists.id or games.id
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  platform_url TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  user_id UUID REFERENCES auth.users NOT NULL
);

-- Create table for user notification settings
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_frequency TEXT NOT NULL DEFAULT 'immediate', -- 'immediate', 'daily', 'disabled'
  artist_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  game_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS to new_releases table
ALTER TABLE public.new_releases ENABLE ROW LEVEL SECURITY;

-- Users can only see their own releases
CREATE POLICY "Users can view their own new releases" 
  ON public.new_releases 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own releases (for the system)
CREATE POLICY "Users can create their own new releases" 
  ON public.new_releases 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own releases
CREATE POLICY "Users can delete their own new releases" 
  ON public.new_releases 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS to notification_settings table
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view their own notification settings" 
  ON public.notification_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" 
  ON public.notification_settings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" 
  ON public.notification_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_new_releases_user_id ON public.new_releases(user_id);
CREATE INDEX idx_new_releases_expires_at ON public.new_releases(expires_at);
CREATE INDEX idx_new_releases_type ON public.new_releases(type);
CREATE INDEX idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to clean up expired releases
CREATE OR REPLACE FUNCTION public.cleanup_expired_releases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.new_releases 
  WHERE expires_at < now();
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up expired releases at %', now();
END;
$$;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'cleanup-expired-releases',
  '0 2 * * *', -- Every day at 2 AM
  'SELECT public.cleanup_expired_releases();'
);
