
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyRelease {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
  total_tracks: number;
}

export const useSpotify = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const searchArtists = async (query: string): Promise<SpotifyArtist[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-spotify-artist-info', {
        body: { query, type: 'search' }
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching artists:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les artistes",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getArtistDetails = async (spotifyId: string): Promise<{ artist: SpotifyArtist; releases: SpotifyRelease[] } | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-spotify-artist-info', {
        body: { query: spotifyId, type: 'artist' }
      });

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting artist details:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les détails de l'artiste",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    searchArtists,
    getArtistDetails,
    loading
  };
};
