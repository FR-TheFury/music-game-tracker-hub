
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useArtistStatsUpdate = () => {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const updateArtistStats = async (artistId?: string, userId?: string) => {
    if (updating) return;

    setUpdating(true);
    try {
      console.log('Triggering artist stats update...');
      
      const body: any = {};
      if (artistId) body.artistId = artistId;
      if (userId) body.userId = userId;

      const { data, error } = await supabase.functions.invoke('update-artist-stats', {
        body
      });

      if (error) {
        console.error('Error updating artist stats:', error);
        throw error;
      }

      console.log('Artist stats update result:', data);
      
      toast({
        title: "Statistiques mises à jour",
        description: `${data?.updatedArtists || 0} artiste(s) mis à jour avec succès`,
      });

      return data;
    } catch (error) {
      console.error('Error in updateArtistStats:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les statistiques",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const updateAllArtistStats = async () => {
    return updateArtistStats();
  };

  const updateUserArtistStats = async (userId: string) => {
    return updateArtistStats(undefined, userId);
  };

  const updateSingleArtistStats = async (artistId: string) => {
    return updateArtistStats(artistId);
  };

  return {
    updating,
    updateArtistStats,
    updateAllArtistStats,
    updateUserArtistStats,
    updateSingleArtistStats,
  };
};
