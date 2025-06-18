
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface YouTubeStats {
  subscriberCount?: number;
  viewCount?: number;
  videoCount?: number;
}

export const useYouTubeData = () => {
  const [loading, setLoading] = useState(false);

  const getYouTubeStats = async (url: string): Promise<YouTubeStats | null> => {
    if (!url || !url.includes('youtube')) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-data-stats', {
        body: { url }
      });

      if (error) {
        console.error('Error fetching YouTube stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error calling YouTube stats function:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getYouTubeStats,
    loading,
  };
};
