
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
    try {
      console.log('Starting cleanup of false notifications...');

      // 1. Supprimer les notifications de sorties suspectes (sans véritable date de sortie)
      const { data: suspiciousReleases, error: fetchError } = await supabase
        .from('new_releases')
        .select('id, title, description, source_item_id')
        .eq('user_id', user.id)
        .eq('type', 'game')
        .ilike('title', '%sortie confirmée%');

      if (fetchError) {
        console.error('Error fetching suspicious releases:', fetchError);
        throw fetchError;
      }

      console.log(`Found ${suspiciousReleases?.length || 0} suspicious release notifications`);

      if (suspiciousReleases && suspiciousReleases.length > 0) {
        // Vérifier chaque notification suspecte
        const falseNotifications = [];
        
        for (const release of suspiciousReleases) {
          // Vérifier le statut réel du jeu
          const { data: gameData } = await supabase
            .from('games')
            .select('name, release_status, release_date')
            .eq('id', release.source_item_id)
            .single();

          if (gameData) {
            // Si le jeu n'a pas de date de sortie ou est encore "coming_soon", c'est une fausse notification
            const hasValidReleaseDate = gameData.release_date && 
                                       gameData.release_date !== 'Coming soon' && 
                                       gameData.release_date !== 'TBD';
            
            if (!hasValidReleaseDate || gameData.release_status === 'coming_soon') {
              falseNotifications.push(release.id);
              console.log(`Marking as false notification: ${release.title} (Game: ${gameData.name})`);
            }
          }
        }

        // Supprimer les fausses notifications
        if (falseNotifications.length > 0) {
          const { error: deleteError } = await supabase
            .from('new_releases')
            .delete()
            .in('id', falseNotifications);

          if (deleteError) {
            console.error('Error deleting false notifications:', deleteError);
            throw deleteError;
          }

          console.log(`Deleted ${falseNotifications.length} false notifications`);
        }
      }

      // 2. Réinitialiser le statut des jeux qui ont été marqués à tort comme "released"
      const { data: releasedGames, error: gamesError } = await supabase
        .from('games')
        .select('id, name, release_date, release_status')
        .eq('user_id', user.id)
        .eq('release_status', 'released');

      if (gamesError) {
        console.error('Error fetching released games:', gamesError);
        throw gamesError;
      }

      console.log(`Found ${releasedGames?.length || 0} games marked as released`);

      if (releasedGames && releasedGames.length > 0) {
        const gamesToReset = [];
        
        for (const game of releasedGames) {
          // Vérifier si le jeu a vraiment une date de sortie valide
          const hasValidReleaseDate = game.release_date && 
                                     game.release_date !== 'Coming soon' && 
                                     game.release_date !== 'TBD' &&
                                     game.release_date !== 'unknown';
          
          if (!hasValidReleaseDate) {
            gamesToReset.push(game.id);
            console.log(`Resetting status for: ${game.name} (invalid release date: ${game.release_date})`);
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

          console.log(`Reset status for ${gamesToReset.length} games`);
        }
      }

      toast({
        title: "Nettoyage terminé",
        description: `Supprimé ${suspiciousReleases?.length || 0} fausses notifications et corrigé le statut de plusieurs jeux.`,
      });

    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Erreur lors du nettoyage",
        description: "Impossible de nettoyer les notifications",
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
