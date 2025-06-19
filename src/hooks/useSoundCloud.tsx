
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SoundCloudArtist {
  id: number;
  username: string;
  full_name: string;
  description: string;
  followers_count: number;
  track_count: number;
  avatar_url: string;
  permalink_url: string;
  verified: boolean;
}

interface SoundCloudTrack {
  id: number;
  title: string;
  description: string;
  created_at: string;
  permalink_url: string;
  artwork_url: string;
  playback_count: number;
  likes_count: number;
  user: {
    username: string;
    permalink_url: string;
  };
}

export const useSoundCloud = () => {
  const [loading, setLoading] = useState(false);

  const searchArtists = async (query: string): Promise<SoundCloudArtist[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-soundcloud-info', {
        body: { 
          query,
          type: 'search-artists'
        }
      });

      if (error) {
        console.error('SoundCloud search error:', error);
        return [];
      }

      return data?.artists || [];
    } catch (error) {
      console.error('SoundCloud API error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistInfo = async (artistUrl: string): Promise<SoundCloudArtist | null> => {
    if (!artistUrl) return null;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-soundcloud-info', {
        body: { 
          artistUrl,
          type: 'artist-info'
        }
      });

      if (error) {
        console.error('SoundCloud artist info error:', error);
        return null;
      }

      return data?.artist || null;
    } catch (error) {
      console.error('SoundCloud API error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getArtistTracks = async (artistUrl: string, limit: number = 10): Promise<SoundCloudTrack[]> => {
    if (!artistUrl) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-soundcloud-info', {
        body: { 
          artistUrl,
          type: 'artist-tracks',
          limit
        }
      });

      if (error) {
        console.error('SoundCloud tracks error:', error);
        return [];
      }

      return data?.tracks || [];
    } catch (error) {
      console.error('SoundCloud API error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    searchArtists,
    getArtistInfo,
    getArtistTracks,
    loading,
  };
};
