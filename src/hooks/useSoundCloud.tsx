
import { useState, useCallback } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const makeRequest = useCallback(async (requestBody: any, retryCount = 0): Promise<any> => {
    try {
      console.log('SoundCloud request:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('get-soundcloud-info', {
        body: requestBody
      });

      if (error) {
        console.error('SoundCloud Edge Function error:', error);
        throw new Error(error.message || 'SoundCloud connection error');
      }

      if (data?.error) {
        console.error('SoundCloud API error:', data.error);
        
        if (data.error === 'rate_limit_exceeded' && retryCount < 2) {
          const waitTime = (retryCount + 1) * 60000; // 1-2 minutes
          console.log(`Rate limit hit, retrying in ${waitTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return makeRequest(requestBody, retryCount + 1);
        }
        
        throw new Error(data.message || data.error);
      }

      return data;
    } catch (error) {
      console.error('SoundCloud request failed:', error);
      throw error;
    }
  }, []);

  const searchArtists = useCallback(async (query: string): Promise<SoundCloudArtist[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Searching SoundCloud artists for:', query);
      
      const data = await makeRequest({
        query,
        type: 'search-artists'
      });

      const artists = data?.artists || [];
      console.log(`SoundCloud search found ${artists.length} artists`);
      
      return artists;
    } catch (error) {
      console.error('SoundCloud artists search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  const getArtistInfo = useCallback(async (artistUrl: string): Promise<SoundCloudArtist | null> => {
    if (!artistUrl) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Getting SoundCloud artist info:', artistUrl);
      
      const data = await makeRequest({
        artistUrl,
        type: 'artist-info'
      });

      const artist = data?.artist || null;
      console.log('SoundCloud artist info retrieved:', artist?.username);
      
      return artist;
    } catch (error) {
      console.error('SoundCloud artist info error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  const getArtistTracks = useCallback(async (artistUrl: string, limit: number = 10): Promise<SoundCloudTrack[]> => {
    if (!artistUrl) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Getting SoundCloud tracks:', artistUrl);
      
      const data = await makeRequest({
        artistUrl,
        type: 'artist-tracks',
        limit
      });

      const tracks = data?.tracks || [];
      console.log(`Retrieved ${tracks.length} SoundCloud tracks`);
      
      return tracks;
    } catch (error) {
      console.error('SoundCloud tracks error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  const getArtistReleases = useCallback(async (artistQuery: string, artistUrl?: string, limit: number = 10): Promise<SoundCloudRelease[]> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Getting SoundCloud releases for:', artistQuery, artistUrl);
      
      const data = await makeRequest({
        query: artistQuery,
        artistUrl,
        type: 'artist-releases',
        limit
      });

      const releases = data?.releases || [];
      console.log(`SoundCloud getArtistReleases returned ${releases.length} releases`);
      
      return releases;
    } catch (error) {
      console.error('SoundCloud releases error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  const getPlaybackStats = useCallback(async (artistQuery: string, artistUrl?: string): Promise<SoundCloudStats | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Getting SoundCloud stats for:', artistQuery, artistUrl);
      
      const data = await makeRequest({
        query: artistQuery,
        artistUrl,
        type: 'playback-stats'
      });

      const stats = {
        totalPlays: data?.totalPlays || 0,
        totalLikes: data?.totalLikes || 0,
        trackCount: data?.trackCount || 0,
        tracks: data?.tracks || []
      };
      
      console.log('SoundCloud stats retrieved:', stats);
      
      return stats;
    } catch (error) {
      console.error('SoundCloud stats error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  return {
    searchArtists,
    getArtistInfo,
    getArtistTracks,
    getArtistReleases,
    getPlaybackStats,
    loading,
    error,
  };
};
