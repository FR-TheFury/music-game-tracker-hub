
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Artist } from '@/types/artist';
import { formatArtistFromDatabase, formatArtistForDatabase } from '@/utils/artistDataHelpers';
import { useArtistReleasesData } from '@/hooks/useArtistReleases';
import { useSoundCloud } from '@/hooks/useSoundCloud';

export const useArtists = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getArtistReleases } = useArtistReleasesData();
  const { getPlaybackStats } = useSoundCloud();

  const { data: rawArtists = [], isLoading: loading } = useQuery({
    queryKey: ['artists', user?.id],
    queryFn: async (): Promise<Artist[]> => {
      if (!user) return [];

      console.log('Fetching artists for user:', user.id);

      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching artists:', error);
        throw error;
      }

      console.log('Raw artists data from DB:', data);

      const formattedArtists = data.map(formatArtistFromDatabase);
      console.log('Formatted artists:', formattedArtists);

      return formattedArtists;
    },
    enabled: !!user,
  });

  // État pour les artistes enrichis avec les stats SoundCloud
  const [artists, setArtists] = useState<Artist[]>(rawArtists);

  // Effet pour enrichir les artistes avec les statistiques SoundCloud
  useEffect(() => {
    if (!rawArtists.length) {
      setArtists([]);
      return;
    }

    const enrichArtistsWithSoundCloudStats = async () => {
      const enrichedArtists = await Promise.all(
        rawArtists.map(async (artist) => {
          // Vérifier si l'artiste a SoundCloud et n'a pas déjà de stats
          const hasSoundCloud = artist.multipleUrls?.some(url => 
            url.platform?.toLowerCase().includes('soundcloud')
          ) || artist.platform?.toLowerCase().includes('soundcloud');

          if (!hasSoundCloud || artist.soundcloudStats) {
            return artist;
          }

          try {
            // Récupérer les stats SoundCloud avec un délai aléatoire pour éviter le rate limiting
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
            const stats = await getPlaybackStats(artist.name, getSoundCloudUrl(artist));
            
            if (stats && stats.totalPlays > 0) {
              return {
                ...artist,
                soundcloudStats: {
                  totalPlays: stats.totalPlays,
                  totalLikes: stats.totalLikes,
                  trackCount: stats.trackCount,
                  lastUpdated: new Date().toISOString()
                }
              };
            }
          } catch (error) {
            console.error(`Erreur chargement stats SoundCloud pour ${artist.name}:`, error);
          }

          return artist;
        })
      );

      setArtists(enrichedArtists);
    };

    // Délai initial pour éviter trop d'appels simultanés
    const timer = setTimeout(enrichArtistsWithSoundCloudStats, 500);
    return () => clearTimeout(timer);
  }, [rawArtists, getPlaybackStats]);

  // Fonction helper pour extraire l'URL SoundCloud
  const getSoundCloudUrl = (artist: Artist) => {
    if (artist?.multipleUrls) {
      const soundcloudLink = artist.multipleUrls.find((link: any) => 
        link.platform?.toLowerCase().includes('soundcloud') || 
        link.url?.toLowerCase().includes('soundcloud')
      );
      return soundcloudLink?.url;
    }
    return undefined;
  };

  const addArtist = async (artistData: Omit<Artist, 'id' | 'addedAt'>) => {
    if (!user) throw new Error('User not authenticated');

    const formattedData = formatArtistForDatabase(artistData, user.id);

    const { data, error } = await supabase
      .from('artists')
      .insert([formattedData])
      .select()
      .single();

    if (error) {
      console.error('Error adding artist:', error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['artists', user.id] });
    return formatArtistFromDatabase(data);
  };

  const removeArtist = async (artistId: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('artists')
      .delete()
      .eq('id', artistId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing artist:', error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['artists', user.id] });
  };

  const updateArtist = async (artistId: string, updates: Partial<Artist>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('artists')
      .update(updates)
      .eq('id', artistId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating artist:', error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['artists', user.id] });
    return formatArtistFromDatabase(data);
  };

  return {
    artists,
    loading,
    addArtist,
    removeArtist,
    updateArtist,
    getArtistReleases,
  };
};
