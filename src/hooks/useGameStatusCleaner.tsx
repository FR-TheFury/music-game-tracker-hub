
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useGameStatusCleaner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const cleanFalseNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    let totalCleanedNotifications = 0;
    let totalResetGames = 0;

    try {
      console.log('Starting cleanup of false notifications...');

      // 1. Nettoyer toutes les notifications de type "game" qui semblent fausses
      const { data: allGameNotifications, error: fetchError } = await supabase
        .from('new_releases')
        .select('id, title, description, source_item_id, detected_at')
        .eq('user_id', user.id)
        .eq('type', 'game');

      if (fetchError) {
        console.error('Error fetching game notifications:', fetchError);
        throw fetchError;
      }

      console.log(`Found ${allGameNotifications?.length || 0} game notifications to analyze`);

      if (allGameNotifications && allGameNotifications.length > 0) {
        const falseNotificationIds = [];
        
        for (const notification of allGameNotifications) {
          // Vérifier le statut réel du jeu correspondant
          const { data: gameData } = await supabase
            .from('games')
            .select('name, release_status, release_date')
            .eq('id', notification.source_item_id)
            .single();

          if (gameData) {
            // Considérer comme fausse notification si :
            // - Le jeu n'a pas de vraie date de sortie
            // - Le statut est encore "coming_soon" 
            // - La date de sortie contient des mots-clés suspects
            const hasInvalidDate = !gameData.release_date || 
                                   gameData.release_date === 'Coming soon' || 
                                   gameData.release_date === 'TBD' ||
                                   gameData.release_date === 'unknown' ||
                                   gameData.release_date.includes('Q') || // Q1, Q2, etc.
                                   gameData.release_date.includes('2024') ||
                                   gameData.release_date.includes('2025');
            
            const isStillComingSoon = gameData.release_status === 'coming_soon';
            
            if (hasInvalidDate || isStillComingSoon) {
              falseNotificationIds.push(notification.id);
              console.log(`Marking as false notification: "${notification.title}" (Game: ${gameData.name}, Date: ${gameData.release_date}, Status: ${gameData.release_status})`);
            }
          } else {
            // Si le jeu n'existe plus, supprimer aussi la notification
            falseNotificationIds.push(notification.id);
            console.log(`Game not found for notification: ${notification.title}`);
          }
        }

        // Supprimer les fausses notifications
        if (falseNotificationIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('new_releases')
            .delete()
            .in('id', falseNotificationIds);

          if (deleteError) {
            console.error('Error deleting false notifications:', deleteError);
            throw deleteError;
          }

          totalCleanedNotifications = falseNotificationIds.length;
          console.log(`Deleted ${totalCleanedNotifications} false notifications`);
        }
      }

      // 2. Réinitialiser le statut des jeux marqués à tort comme "released"
      const { data: suspiciousGames, error: gamesError } = await supabase
        .from('games')
        .select('id, name, release_date, release_status')
        .eq('user_id', user.id)
        .eq('release_status', 'released');

      if (gamesError) {
        console.error('Error fetching released games:', gamesError);
        throw gamesError;
      }

      console.log(`Found ${suspiciousGames?.length || 0} games marked as released`);

      if (suspiciousGames && suspiciousGames.length > 0) {
        const gamesToReset = [];
        
        for (const game of suspiciousGames) {
          // Vérifier si le jeu a vraiment une date de sortie valide
          const hasInvalidDate = !game.release_date || 
                                 game.release_date === 'Coming soon' || 
                                 game.release_date === 'TBD' ||
                                 game.release_date === 'unknown' ||
                                 game.release_date.includes('Q') ||
                                 game.release_date.includes('2024') ||
                                 game.release_date.includes('2025');
          
          if (hasInvalidDate) {
            gamesToReset.push(game.id);
            console.log(`Will reset status for: "${game.name}" (invalid release date: ${game.release_date})`);
          }
        }

        // Réinitialiser le statut des jeux
        if (gamesToReset.length > 0) {
          const { error: updateError } = await supabase
            .from('games')
            .update({ 
              release_status: 'coming_soon',
              last_status_check: new Date().toISOString()
            })
            .in('id', gamesToReset);

          if (updateError) {
            console.error('Error updating game statuses:', updateError);
            throw updateError;
          }

          totalResetGames = gamesToReset.length;
          console.log(`Reset status for ${totalResetGames} games`);
        }
      }

      // Message de succès avec détails
      const message = totalCleanedNotifications > 0 || totalResetGames > 0 
        ? `Nettoyage terminé : ${totalCleanedNotifications} notifications supprimées et ${totalResetGames} jeux corrigés.`
        : "Aucune fausse notification ou jeu incorrect trouvé. Tout semble propre !";

      toast({
        title: "Nettoyage terminé",
        description: message,
      });

      console.log(`Cleanup completed: ${totalCleanedNotifications} notifications cleaned, ${totalResetGames} games reset`);

    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Erreur lors du nettoyage",
        description: `Impossible de nettoyer les notifications: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cleanFalseNotifications,
    isLoading,
  };
};
