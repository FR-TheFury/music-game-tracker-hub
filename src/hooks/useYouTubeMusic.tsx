
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface YouTubeMusicArtist {
  id: string;
  name: string;
  thumbnails?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  subscribers?: string;
  description?: string;
  channelUrl?: string;
}

interface YouTubeMusicArtistDetails extends YouTubeMusicArtist {
  videos?: any[];
}

export const useYouTubeMusic = () => {
  const [loading, setLoading] = useState(false);

  const searchArtists = async (query: string): Promise<YouTubeMusicArtist[]> => {
    if (!query.trim()) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-music-info', {
        body: { artistName: query, type: 'search' }
      });

      if (error) {
        console.error('YouTube Music search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('YouTube Music search error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistDetails = async (channelId: string): Promise<YouTubeMusicArtistDetails | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-music-info', {
        body: { channelId, type: 'artist' }
      });

      if (error) {
        console.error('YouTube Music artist details error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('YouTube Music artist details error:', error);
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
