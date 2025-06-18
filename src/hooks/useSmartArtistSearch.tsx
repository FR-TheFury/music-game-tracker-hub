
import { useState } from 'react';
import { useSpotify } from './useSpotify';
import { useDeezer } from './useDeezer';
import { useYouTube } from './useYouTube';
import { supabase } from '@/integrations/supabase/client';

interface SmartArtistResult {
  // Données principales (Spotify)
  id: string;
  name: string;
  spotifyId: string;
  genres: string[];
  popularity: number;
  followersCount: number;
  profileImageUrl: string;
  bio?: string;
  
  // URLs générées pour toutes les plateformes
  platformUrls: {
    spotify: string;
    deezer?: string;
    youtube?: string;
    youtubeMusic?: string;
    amazonMusic?: string;
  };
  
  // Données enrichies
  verified: {
    spotify: boolean;
    deezer: boolean;
    youtube: boolean;
  };
}

export const useSmartArtistSearch = () => {
  const [loading, setLoading] = useState(false);
  const { searchArtists: searchSpotify } = useSpotify();
  const { searchArtists: searchDeezer } = useDeezer();
  const { searchArtists: searchYouTube } = useYouTube();

  const generatePlatformUrls = (artistName: string) => {
    const cleanName = artistName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    const spacelessName = artistName.replace(/\s+/g, '').toLowerCase();
    
    return {
      youtubeMusic: `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`,
      amazonMusic: `https://music.amazon.com/search/${encodeURIComponent(artistName)}`,
      appleMusic: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
      tidal: `https://listen.tidal.com/search?q=${encodeURIComponent(artistName)}`,
      soundcloud: `https://soundcloud.com/search?q=${encodeURIComponent(artistName)}`,
    };
  };

  const verifyYouTubeUrl = async (artistName: string): Promise<{ url: string | null; verified: boolean }> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-info', {
        body: { artistName, type: 'generateUrl' }
      });
      
      if (error || !data) {
        return { url: null, verified: false };
      }
      
      return { url: data.url, verified: data.verified || false };
    } catch (error) {
      console.error('Error verifying YouTube URL:', error);
      return { url: null, verified: false };
    }
  };

  const smartSearch = async (query: string): Promise<SmartArtistResult[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    try {
      // 1. Recherche principale sur Spotify
      const spotifyResults = await searchSpotify(query);
      
      // 2. Recherche complémentaire sur Deezer
      const deezerResults = await searchDeezer(query);
      
      // 3. Pour chaque résultat Spotify, enrichir avec les autres plateformes
      const enrichedResults = await Promise.all(
        spotifyResults.map(async (spotifyArtist) => {
          // Générer les URLs de base
          const generatedUrls = generatePlatformUrls(spotifyArtist.name);
          
          // Vérifier YouTube avec l'API
          const youtubeVerification = await verifyYouTubeUrl(spotifyArtist.name);
          
          // Trouver la correspondance Deezer
          const deezerMatch = deezerResults.find(
            deezer => deezer.name.toLowerCase() === spotifyArtist.name.toLowerCase()
          );
          
          const result: SmartArtistResult = {
            id: spotifyArtist.id,
            name: spotifyArtist.name,
            spotifyId: spotifyArtist.id,
            genres: spotifyArtist.genres || [],
            popularity: spotifyArtist.popularity || 0,
            followersCount: spotifyArtist.followers?.total || 0,
            profileImageUrl: spotifyArtist.images?.[0]?.url || '',
            bio: deezerMatch?.name ? `Artiste disponible sur Spotify et Deezer` : `Artiste disponible sur Spotify`,
            
            platformUrls: {
              spotify: spotifyArtist.external_urls?.spotify || '',
              deezer: deezerMatch?.link,
              youtube: youtubeVerification.url || undefined,
              youtubeMusic: generatedUrls.youtubeMusic,
              amazonMusic: generatedUrls.amazonMusic,
            },
            
            verified: {
              spotify: true,
              deezer: !!deezerMatch,
              youtube: youtubeVerification.verified,
            }
          };
          
          return result;
        })
      );
      
      return enrichedResults;
      
    } catch (error) {
      console.error('Smart search error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    smartSearch,
    loading,
  };
};
