
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  id?: string;
  user_id: string;
  email_notifications_enabled: boolean;
  notification_frequency: 'immediate' | 'daily' | 'disabled';
  artist_notifications_enabled: boolean;
  game_notifications_enabled: boolean;
}

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          user_id: data.user_id,
          email_notifications_enabled: data.email_notifications_enabled,
          notification_frequency: data.notification_frequency as 'immediate' | 'daily' | 'disabled',
          artist_notifications_enabled: data.artist_notifications_enabled,
          game_notifications_enabled: data.game_notifications_enabled,
        });
      } else {
        // Create default settings if none exist
        console.log('Creating default notification settings for user:', user.id);
        const defaultSettings: Omit<NotificationSettings, 'id'> = {
          user_id: user.id,
          email_notifications_enabled: true,
          notification_frequency: 'immediate',
          artist_notifications_enabled: true,
          game_notifications_enabled: true,
        };
        await updateSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de notification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    try {
      const settingsData = {
        user_id: user.id,
        email_notifications_enabled: newSettings.email_notifications_enabled ?? settings?.email_notifications_enabled ?? true,
        notification_frequency: newSettings.notification_frequency ?? settings?.notification_frequency ?? 'immediate',
        artist_notifications_enabled: newSettings.artist_notifications_enabled ?? settings?.artist_notifications_enabled ?? true,
        game_notifications_enabled: newSettings.game_notifications_enabled ?? settings?.game_notifications_enabled ?? true,
      };

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert(settingsData)
        .select()
        .single();

      if (error) throw error;

      setSettings({
        id: data.id,
        user_id: data.user_id,
        email_notifications_enabled: data.email_notifications_enabled,
        notification_frequency: data.notification_frequency as 'immediate' | 'daily' | 'disabled',
        artist_notifications_enabled: data.artist_notifications_enabled,
        game_notifications_enabled: data.game_notifications_enabled,
      });

      toast({
        title: "Paramètres mis à jour",
        description: "Vos paramètres de notification ont été sauvegardés.",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
  };
};
