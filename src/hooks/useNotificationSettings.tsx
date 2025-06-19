
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
      console.log('Fetching notification settings for user:', user.id);
      
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification settings:', error);
        throw error;
      }

      if (data) {
        console.log('Found existing settings:', data);
        setSettings({
          id: data.id,
          user_id: data.user_id,
          email_notifications_enabled: data.email_notifications_enabled,
          notification_frequency: data.notification_frequency as 'immediate' | 'daily' | 'disabled',
          artist_notifications_enabled: data.artist_notifications_enabled,
          game_notifications_enabled: data.game_notifications_enabled,
        });
      } else {
        console.log('No existing settings found, creating defaults');
        // Create default settings if none exist
        const defaultSettings: Omit<NotificationSettings, 'id'> = {
          user_id: user.id,
          email_notifications_enabled: true,
          notification_frequency: 'immediate',
          artist_notifications_enabled: true,
          game_notifications_enabled: true,
        };
        
        const { data: newData, error: createError } = await supabase
          .from('notification_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          console.error('Error creating default settings:', createError);
          throw createError;
        }

        console.log('Created default settings:', newData);
        setSettings({
          id: newData.id,
          user_id: newData.user_id,
          email_notifications_enabled: newData.email_notifications_enabled,
          notification_frequency: newData.notification_frequency as 'immediate' | 'daily' | 'disabled',
          artist_notifications_enabled: newData.artist_notifications_enabled,
          game_notifications_enabled: newData.game_notifications_enabled,
        });
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
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
    if (!user || !settings) {
      console.error('No user or settings available');
      return;
    }

    try {
      console.log('Updating settings with:', newSettings);
      
      const updatedSettings = {
        user_id: user.id,
        email_notifications_enabled: newSettings.email_notifications_enabled ?? settings.email_notifications_enabled,
        notification_frequency: newSettings.notification_frequency ?? settings.notification_frequency,
        artist_notifications_enabled: newSettings.artist_notifications_enabled ?? settings.artist_notifications_enabled,
        game_notifications_enabled: newSettings.game_notifications_enabled ?? settings.game_notifications_enabled,
      };

      console.log('Final settings to update:', updatedSettings);

      // Update using the ID if we have one
      const { data, error } = await supabase
        .from('notification_settings')
        .update(updatedSettings)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating notification settings:', error);
        throw error;
      }

      console.log('Successfully updated settings:', data);

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
      console.error('Error in updateSettings:', error);
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
