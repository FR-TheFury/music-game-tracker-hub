
import { supabase } from '@/integrations/supabase/client';
import { ArtistRelease } from '@/types/artist';

export const useArtistReleasesData = () => {
  const getArtistReleases = async (artistId: string): Promise<ArtistRelease[]> => {
    try {
      const { data, error } = await supabase
        .from('artist_releases')
        .select('*')
        .eq('artist_id', artistId)
        .order('release_date', { ascending: false });

      if (error) throw error;

      return data.map(release => ({
        id: release.id,
        spotifyId: release.spotify_id,
        name: release.name,
        releaseType: release.release_type,
        releaseDate: release.release_date,
        imageUrl: release.image_url,
        externalUrls: release.external_urls,
        totalTracks: release.total_tracks,
        popularity: release.popularity,
        createdAt: release.created_at,
      }));
    } catch (error) {
      console.error('Error fetching artist releases:', error);
      return [];
    }
  };

  return { getArtistReleases };
};
