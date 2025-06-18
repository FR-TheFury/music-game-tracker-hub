
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AmazonMusicArtist {
  id: string;
  name: string;
  imageUrl?: string;
  artistUrl?: string;
  bio?: string;
  followers?: number;
}

interface AmazonMusicArtistDetails extends AmazonMusicArtist {
  albums?: any[];
}

export const useAmazonMusic = () => {
  const [loading, setLoading] = useState(false);

  const searchArtists = async (query: string): Promise<AmazonMusicArtist[]> => {
    if (!query.trim()) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-amazon-music-info', {
        body: { artistName: query, type: 'search' }
      });

      if (error) {
        console.error('Amazon Music search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Amazon Music search error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistDetails = async (artistId: string): Promise<AmazonMusicArtistDetails | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-amazon-music-info', {
        body: { artistId, type: 'artist' }
      });

      if (error) {
        console.error('Amazon Music artist details error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Amazon Music artist details error:', error);
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
