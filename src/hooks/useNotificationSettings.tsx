
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  id?: string;
  userId: string;
  emailNotificationsEnabled: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'disabled';
  artistNotificationsEnabled: boolean;
  gameNotificationsEnabled: boolean;
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
          userId: data.user_id,
          emailNotificationsEnabled: data.email_notifications_enabled,
          notificationFrequency: data.notification_frequency as 'immediate' | 'daily' | 'disabled',
          artistNotificationsEnabled: data.artist_notifications_enabled,
          gameNotificationsEnabled: data.game_notifications_enabled,
        });
      } else {
        // Create default settings if none exist
        const defaultSettings: Omit<NotificationSettings, 'id'> = {
          userId: user.id,
          emailNotificationsEnabled: true,
          notificationFrequency: 'immediate',
          artistNotificationsEnabled: true,
          gameNotificationsEnabled: true,
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
        email_notifications_enabled: newSettings.emailNotificationsEnabled ?? true,
        notification_frequency: newSettings.notificationFrequency ?? 'immediate',
        artist_notifications_enabled: newSettings.artistNotificationsEnabled ?? true,
        game_notifications_enabled: newSettings.gameNotificationsEnabled ?? true,
      };

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert(settingsData)
        .select()
        .single();

      if (error) throw error;

      setSettings({
        id: data.id,
        userId: data.user_id,
        emailNotificationsEnabled: data.email_notifications_enabled,
        notificationFrequency: data.notification_frequency as 'immediate' | 'daily' | 'disabled',
        artistNotificationsEnabled: data.artist_notifications_enabled,
        gameNotificationsEnabled: data.game_notifications_enabled,
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
