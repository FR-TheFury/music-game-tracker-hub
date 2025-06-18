
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface YouTubeArtist {
  id: string;
  name: string;
  thumbnails?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  subscriberCount?: string;
  description?: string;
  channelUrl?: string;
  customUrl?: string;
}

interface YouTubeArtistDetails extends YouTubeArtist {
  videos?: any[];
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

export const useYouTube = () => {
  const [loading, setLoading] = useState(false);

  const searchArtists = async (query: string): Promise<YouTubeArtist[]> => {
    if (!query.trim()) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-info', {
        body: { artistName: query, type: 'search' }
      });

      if (error) {
        console.error('YouTube search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('YouTube search error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistDetails = async (channelId: string): Promise<YouTubeArtistDetails | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-info', {
        body: { channelId, type: 'artist' }
      });

      if (error) {
        console.error('YouTube artist details error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('YouTube artist details error:', error);
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
