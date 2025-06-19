
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface NewRelease {
  id: string;
  type: 'artist' | 'game';
  sourceItemId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  platformUrl?: string;
  detectedAt: string;
  expiresAt: string;
  userId: string;
}

export const useNewReleases = () => {
  const [releases, setReleases] = useState<NewRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const cleanupExpiredReleases = async () => {
    try {
      console.log('Triggering automatic cleanup of expired notifications...');
      const { data, error } = await supabase.functions.invoke('cleanup-expired-notifications');

      if (error) {
        console.error('Error calling cleanup function:', error);
      } else {
        console.log('Cleanup result:', data);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const fetchReleases = async () => {
    if (!user) return;

    try {
      // Nettoyer automatiquement les notifications expirées avant de récupérer les données
      await cleanupExpiredReleases();

      const { data, error } = await supabase
        .from('new_releases')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString()) // Ne récupérer que les notifications non expirées
        .order('detected_at', { ascending: false });

      if (error) throw error;

      const formattedReleases = data.map(release => ({
        id: release.id,
        type: release.type as 'artist' | 'game',
        sourceItemId: release.source_item_id,
        title: release.title,
        description: release.description,
        imageUrl: release.image_url,
        platformUrl: release.platform_url,
        detectedAt: release.detected_at,
        expiresAt: release.expires_at,
        userId: release.user_id,
      }));

      setReleases(formattedReleases);
    } catch (error) {
      console.error('Error fetching new releases:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les nouvelles sorties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeRelease = async (id: string) => {
    try {
      const { error } = await supabase
        .from('new_releases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReleases(prev => prev.filter(release => release.id !== id));
      
      toast({
        title: "Notification supprimée",
        description: "La notification a été retirée.",
      });
    } catch (error) {
      console.error('Error removing release:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReleases();
    
    // Nettoyer automatiquement toutes les heures
    const cleanupInterval = setInterval(cleanupExpiredReleases, 60 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, [user]);

  return {
    releases,
    loading,
    removeRelease,
    refetch: fetchReleases,
    cleanupExpiredReleases,
  };
};
