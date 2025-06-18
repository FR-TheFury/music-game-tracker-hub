
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
  const { getArtistReleases } = useArtistReleasesData();

  const { data: artists = [], isLoading: loading } = useQuery({
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

      // Enrichir avec les statistiques Spotify si disponible
      const enrichedArtists = await Promise.all(
        formattedArtists.map(async (artist) => {
          console.log(`Processing artist: ${artist.name}`);
          console.log(`Artist data:`, {
            totalStreams: artist.totalStreams,
            totalPlays: artist.totalPlays,
            lifetimePlays: artist.lifetimePlays,
            followersCount: artist.followersCount,
            spotifyId: artist.spotifyId
          });

          // Si l'artiste a un Spotify ID et que les données sont manquantes ou obsolètes
          if (artist.spotifyId && (!artist.totalStreams || !artist.lastUpdated)) {
            try {
              console.log(`Fetching Spotify data for artist: ${artist.name}`);
              const { data: spotifyData, error: spotifyError } = await supabase.functions.invoke('get-spotify-artist-info', {
                body: { 
                  artistId: artist.spotifyId,
                  includeAlbums: false 
                }
              });

              if (spotifyError) {
                console.error('Error fetching Spotify data:', spotifyError);
              } else if (spotifyData) {
                console.log(`Spotify data received for ${artist.name}:`, spotifyData);
                
                const updatedArtist = {
                  ...artist,
                  followersCount: spotifyData.followers?.total || artist.followersCount,
                  popularity: spotifyData.popularity || artist.popularity,
                  monthlyListeners: spotifyData.monthlyListeners || artist.monthlyListeners,
                  totalStreams: spotifyData.totalStreams || artist.totalStreams,
                  lastUpdated: new Date().toISOString(),
                };

                // Mettre à jour en base de données
                const { error: updateError } = await supabase
                  .from('artists')
                  .update({
                    followers_count: updatedArtist.followersCount,
                    popularity: updatedArtist.popularity,
                    monthly_listeners: updatedArtist.monthlyListeners,
                    total_streams: updatedArtist.totalStreams,
                    last_updated: updatedArtist.lastUpdated,
                  })
                  .eq('id', artist.id);

                if (updateError) {
                  console.error('Error updating artist in DB:', updateError);
                } else {
                  console.log(`Updated artist ${artist.name} in database`);
                }

                return updatedArtist;
              }
            } catch (error) {
              console.warn('Failed to fetch Spotify stats for artist:', artist.name, error);
            }
          }

          // Pour YouTube, enrichir avec les stats si nécessaire
          const isYouTube = artist.platform.toLowerCase().includes('youtube');
          if (isYouTube && (!artist.totalStreams || !artist.lastUpdated)) {
            try {
              console.log(`Fetching YouTube data for artist: ${artist.name}`);
              const youtubeStats = await getYouTubeStats(artist.url);
              if (youtubeStats) {
                console.log(`YouTube stats for ${artist.name}:`, youtubeStats);
                return {
                  ...artist,
                  followersCount: youtubeStats.subscriberCount || artist.followersCount,
                  totalStreams: youtubeStats.viewCount || artist.totalStreams,
                  lastUpdated: new Date().toISOString(),
                };
              }
            } catch (error) {
              console.warn('Failed to fetch YouTube stats for artist:', artist.name, error);
            }
          }

          return artist;
        })
      );

      console.log('Final enriched artists:', enrichedArtists);
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
