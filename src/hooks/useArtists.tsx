
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useYouTubeData } from '@/hooks/useYouTubeData';
import { Artist } from '@/types/artist';
import { formatArtistFromDatabase, formatArtistForDatabase } from '@/utils/artistDataHelpers';
import { useArtistReleasesData } from '@/hooks/useArtistReleases';

export const useArtists = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getYouTubeStats } = useYouTubeData();
  const { getArtistReleases } = useArtistReleas`eData();

  const { data: artists = [], isLoading: loading } = useQuery({
    queryKey: ['artists', user?.id],
    queryFn: async (): Promise<Artist[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching artists:', error);
        throw error;
      }

      const formattedArtists = data.map(formatArtistFromDatabase);

      // Enrichir avec les statistiques YouTube pour les artistes YouTube uniquement si nécessaire
      const enrichedArtists = await Promise.all(
        formattedArtists.map(async (artist) => {
          const isYouTube = artist.platform.toLowerCase().includes('youtube');
          
          // Ne récupérer les stats YouTube que si les données ne sont pas déjà présentes ou sont obsolètes
          if (isYouTube && (!artist.totalStreams || !artist.lastUpdated)) {
            try {
              const youtubeStats = await getYouTubeStats(artist.url);
              if (youtubeStats) {
                return {
                  ...artist,
                  followersCount: youtubeStats.subscriberCount || artist.followersCount,
                  totalStreams: youtubeStats.viewCount || artist.totalStreams || artist.totalPlays,
                };
              }
            } catch (error) {
              console.warn('Failed to fetch YouTube stats for artist:', artist.name, error);
            }
          }
          return artist;
        })
      );

      return enrichedArtists;
    },
    enabled: !!user,
  });

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
