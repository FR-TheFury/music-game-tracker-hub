
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Artist } from '@/types/artist';
import { formatArtistFromDatabase, formatArtistForDatabase } from '@/utils/artistDataHelpers';
import { useArtistReleasesData } from '@/hooks/useArtistReleases';

export const useArtists = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getArtistReleases } = useArtistReleasesData();

  const { data: artists = [], isLoading: loading } = useQuery({
    queryKey: ['artists', user?.id],
    queryFn: async (): Promise<Artist[]> => {
      if (!user) return [];

      console.log('Fetching artists for user:', user.id);

      // Optimisation : sélectionner seulement les champs nécessaires pour l'affichage initial
      const { data, error } = await supabase
        .from('artists')
        .select(`
          id,
          name,
          platform,
          url,
          image_url,
          profile_image_url,
          created_at,
          last_release,
          bio,
          genres,
          followers_count,
          popularity,
          multiple_urls,
          spotify_id,
          deezer_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching artists:', error);
        throw error;
      }

      console.log('Raw artists data from DB:', data?.length || 0, 'artists loaded');

      const formattedArtists = data?.map(formatArtistFromDatabase) || [];
      console.log('Artists loaded successfully in', performance.now(), 'ms');

      return formattedArtists;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Garde en cache pendant 10 minutes
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
