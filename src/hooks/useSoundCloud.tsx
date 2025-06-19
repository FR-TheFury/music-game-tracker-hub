
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
  const [error, setError] = useState<string | null>(null);

  const makeRequest = async (requestBody: any): Promise<any> => {
    try {
      console.log('SoundCloud request:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('get-soundcloud-info', {
        body: requestBody
      });

      if (error) {
        console.error('SoundCloud Edge Function error:', error);
        throw new Error(error.message || 'Erreur de connexion SoundCloud');
      }

      if (data?.error) {
        console.error('SoundCloud API error:', data.error);
        throw new Error(data.message || data.error);
      }

      return data;
    } catch (error) {
      console.error('SoundCloud request failed:', error);
      throw error;
    }
  };

  const searchArtists = async (query: string): Promise<SoundCloudArtist[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Recherche d\'artistes SoundCloud pour:', query);
      
      const data = await makeRequest({
        query,
        type: 'search-artists'
      });

      const artists = data?.artists || [];
      console.log(`Recherche SoundCloud trouvé ${artists.length} artistes`);
      
      return artists;
    } catch (error) {
      console.error('Erreur recherche artistes SoundCloud:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistInfo = async (artistUrl: string): Promise<SoundCloudArtist | null> => {
    if (!artistUrl) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Récupération infos artiste SoundCloud:', artistUrl);
      
      const data = await makeRequest({
        artistUrl,
        type: 'artist-info'
      });

      const artist = data?.artist || null;
      console.log('Infos artiste SoundCloud récupérées:', artist?.username);
      
      return artist;
    } catch (error) {
      console.error('Erreur infos artiste SoundCloud:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getArtistTracks = async (artistUrl: string, limit: number = 10): Promise<SoundCloudTrack[]> => {
    if (!artistUrl) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Récupération tracks SoundCloud:', artistUrl);
      
      const data = await makeRequest({
        artistUrl,
        type: 'artist-tracks',
        limit
      });

      const tracks = data?.tracks || [];
      console.log(`Récupéré ${tracks.length} tracks SoundCloud`);
      
      return tracks;
    } catch (error) {
      console.error('Erreur tracks SoundCloud:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistReleases = async (artistQuery: string, artistUrl?: string, limit: number = 10): Promise<SoundCloudRelease[]> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Récupération sorties SoundCloud pour:', artistQuery, artistUrl);
      
      const data = await makeRequest({
        query: artistQuery,
        artistUrl,
        type: 'artist-releases',
        limit
      });

      const releases = data?.releases || [];
      console.log(`SoundCloud getArtistReleases retourné ${releases.length} sorties`);
      
      return releases;
    } catch (error) {
      console.error('Erreur sorties SoundCloud:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getPlaybackStats = async (artistQuery: string, artistUrl?: string): Promise<SoundCloudStats | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Récupération stats SoundCloud pour:', artistQuery, artistUrl);
      
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
      
      console.log('Stats SoundCloud récupérées:', stats);
      
      return stats;
    } catch (error) {
      console.error('Erreur stats SoundCloud:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
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
    error,
  };
};
