
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

interface SoundCloudRelease {
  id: number;
  title: string;
  created_at: string;
  permalink_url: string;
  artwork_url: string;
  playback_count: number;
  likes_count: number;
  release_date: string;
}

interface SoundCloudStats {
  totalPlays: number;
  totalLikes: number;
  trackCount: number;
  tracks: SoundCloudTrack[];
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

  const getArtistReleases = async (artistQuery: string, artistUrl?: string, limit: number = 10): Promise<SoundCloudRelease[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-soundcloud-info', {
        body: { 
          query: artistQuery,
          artistUrl,
          type: 'artist-releases',
          limit
        }
      });

      if (error) {
        console.error('SoundCloud releases error:', error);
        return [];
      }

      return data?.releases || [];
    } catch (error) {
      console.error('SoundCloud API error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getPlaybackStats = async (artistQuery: string, artistUrl?: string): Promise<SoundCloudStats | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-soundcloud-info', {
        body: { 
          query: artistQuery,
          artistUrl,
          type: 'playback-stats'
        }
      });

      if (error) {
        console.error('SoundCloud stats error:', error);
        return null;
      }

      return {
        totalPlays: data?.totalPlays || 0,
        totalLikes: data?.totalLikes || 0,
        trackCount: data?.trackCount || 0,
        tracks: data?.tracks || []
      };
    } catch (error) {
      console.error('SoundCloud API error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    searchArtists,
    getArtistInfo,
    getArtistTracks,
    getArtistReleases,
    getPlaybackStats,
    loading,
  };
};
