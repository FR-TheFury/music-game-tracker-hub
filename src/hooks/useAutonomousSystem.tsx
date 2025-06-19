
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useAutonomousSystem = () => {
  const [isTestingSystem, setIsTestingSystem] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const testAutonomousSystem = async () => {
    if (!user) return;

    setIsTestingSystem(true);
    
    try {
      console.log('Testing autonomous system...');

      // 1. Déclencher manuellement la vérification des sorties
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-new-releases', {
        body: { manual_test: true, user_id: user.id }
      });

      if (checkError) {
        console.error('Error in release check:', checkError);
        throw checkError;
      }

      console.log('Release check result:', checkData);

      // 2. Vérifier les paramètres de notification de l'utilisateur
      const { data: settingsData, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error checking notification settings:', settingsError);
        throw settingsError;
      }

      // 3. Créer les paramètres de notification s'ils n'existent pas
      if (!settingsData) {
        console.log('Creating default notification settings...');
        const { error: createError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            email_notifications_enabled: true,
            artist_notifications_enabled: true,
            game_notifications_enabled: true,
            notification_frequency: 'immediate'
          });

        if (createError) {
          console.error('Error creating notification settings:', createError);
          throw createError;
        }
      }

      // 4. Vérifier les nouvelles notifications créées
      const { data: newNotifications, error: notifError } = await supabase
        .from('new_releases')
        .select('*')
        .eq('user_id', user.id)
        .gte('detected_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('detected_at', { ascending: false });

      if (notifError) {
        console.error('Error checking new notifications:', notifError);
        throw notifError;
      }

      console.log('New notifications found:', newNotifications?.length || 0);

      const message = `Test terminé avec succès ! 
        - Vérification des sorties : ✓
        - Paramètres de notification : ${settingsData ? '✓' : 'Créés'}
        - Nouvelles notifications : ${newNotifications?.length || 0}`;

      toast({
        title: "Test du système autonome réussi",
        description: message,
        duration: 10000,
      });

      return {
        success: true,
        newNotifications: newNotifications?.length || 0,
        settingsConfigured: !!settingsData,
        checkData
      };

    } catch (error) {
      console.error('Error testing autonomous system:', error);
      toast({
        title: "Erreur lors du test",
        description: `Impossible de tester le système autonome: ${error.message}`,
        variant: "destructive",
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsTestingSystem(false);
    }
  };

  const setupAutonomousSystem = async () => {
    if (!user) return;

    try {
      console.log('Setting up autonomous system for user:', user.id);

      // 1. Créer ou mettre à jour les paramètres de notification
      const { data: existingSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!existingSettings) {
        const { error: settingsError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            email_notifications_enabled: true,
            artist_notifications_enabled: true,
            game_notifications_enabled: true,
            notification_frequency: 'immediate'
          });

        if (settingsError) {
          console.error('Error creating notification settings:', settingsError);
          throw settingsError;
        }
      }

      // 2. Déclencher un premier test du système
      await testAutonomousSystem();

      toast({
        title: "Système autonome configuré",
        description: "Le système de vérification automatique est maintenant actif",
      });

    } catch (error) {
      console.error('Error setting up autonomous system:', error);
      toast({
        title: "Erreur de configuration",
        description: `Impossible de configurer le système autonome: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return {
    testAutonomousSystem,
    setupAutonomousSystem,
    isTestingSystem,
  };
};
