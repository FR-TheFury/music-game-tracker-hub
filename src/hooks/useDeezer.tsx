
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeezerArtist {
  id: number;
  name: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
  nb_album: number;
  nb_fan: number;
  radio: boolean;
  tracklist: string;
  type: string;
  link: string;
}

interface DeezerArtistDetails extends DeezerArtist {
  albums?: any[];
}

export const useDeezer = () => {
  const [loading, setLoading] = useState(false);

  const searchArtists = async (query: string): Promise<DeezerArtist[]> => {
    if (!query.trim()) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-deezer-artist-info', {
        body: { artistName: query }
      });

      if (error) {
        console.error('Deezer search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Deezer search error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistDetails = async (artistId: number): Promise<DeezerArtistDetails | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-deezer-artist-info', {
        body: { artistId: artistId.toString() }
      });

      if (error) {
        console.error('Deezer artist details error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Deezer artist details error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    searchArtists,
    getArtistDetails,
    loading,
  };
};
