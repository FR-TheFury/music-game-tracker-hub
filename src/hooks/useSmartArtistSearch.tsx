
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
  
  // URLs vérifiées pour toutes les plateformes
  platformUrls: {
    spotify: string;
    deezer?: string;
    youtube?: string;
    youtubeMusic?: string;
    amazonMusic?: string;
  };
  
  // Statistiques par plateforme
  platformStats: Array<{
    platform: string;
    followers?: number;
    popularity?: number;
    verified: boolean;
  }>;
  
  // Statistiques cumulées
  totalFollowers: number;
  averagePopularity: number;
}

export const useSmartArtistSearch = () => {
  const [loading, setLoading] = useState(false);
  const { searchArtists: searchSpotify } = useSpotify();
  const { searchArtists: searchDeezer } = useDeezer();
  const { searchArtists: searchYouTube } = useYouTube();

  const generatePlatformUrls = (artistName: string) => {
    const cleanName = artistName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    
    return {
      youtubeMusic: `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`,
      amazonMusic: `https://music.amazon.com/search/${encodeURIComponent(artistName)}`,
      appleMusic: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
      tidal: `https://listen.tidal.com/search?q=${encodeURIComponent(artistName)}`,
      soundcloud: `https://soundcloud.com/search?q=${encodeURIComponent(artistName)}`,
    };
  };

  const verifyYouTubeUrl = async (artistName: string): Promise<{ url: string | null; verified: boolean; followers?: number }> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-info', {
        body: { artistName, type: 'generateUrl' }
      });
      
      if (error || !data) {
        return { url: null, verified: false };
      }
      
      // Si on a trouvé une chaîne, essayer de récupérer les statistiques
      if (data.url && data.verified) {
        try {
          const channelId = data.url.split('/').pop();
          const statsData = await supabase.functions.invoke('get-youtube-info', {
            body: { channelId, type: 'artist' }
          });
          
          const subscriberCount = statsData.data?.subscriberCount ? 
            parseInt(statsData.data.subscriberCount) : undefined;
          
          return { 
            url: data.url, 
            verified: true,
            followers: subscriberCount
          };
        } catch (statsError) {
          return { url: data.url, verified: true };
        }
      }
      
      return { url: data.url, verified: data.verified || false };
    } catch (error) {
      console.error('Error verifying YouTube URL:', error);
      return { url: null, verified: false };
    }
  };

  const calculateCumulativeStats = (platformStats: Array<{
    platform: string;
    followers?: number;
    popularity?: number;
    verified: boolean;
  }>) => {
    // Calculer le total des followers (en évitant les doublons potentiels)
    let totalFollowers = 0;
    let popularitySum = 0;
    let popularityCount = 0;

    platformStats.forEach(stat => {
      if (stat.followers && stat.verified) {
        // Pour éviter les doublons, on prend un pourcentage selon la plateforme
        let followerWeight = 1;
        switch (stat.platform.toLowerCase()) {
          case 'spotify':
            followerWeight = 1; // Poids complet pour Spotify
            break;
          case 'youtube':
            followerWeight = 0.8; // 80% pour YouTube (possibles abonnés non-musicaux)
            break;
          case 'deezer':
            followerWeight = 0.9; // 90% pour Deezer
            break;
          default:
            followerWeight = 0.7; // 70% pour les autres
        }
        totalFollowers += Math.round(stat.followers * followerWeight);
      }

      if (stat.popularity && stat.popularity > 0) {
        popularitySum += stat.popularity;
        popularityCount++;
      }
    });

    const averagePopularity = popularityCount > 0 ? popularitySum / popularityCount : 0;

    return {
      totalFollowers,
      averagePopularity: Math.round(averagePopularity)
    };
  };

  const smartSearch = async (query: string): Promise<SmartArtistResult[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    try {
      // 1. Recherche principale sur Spotify
      const spotifyResults = await searchSpotify(query);
      
      // 2. Recherche complémentaire sur Deezer et YouTube
      const [deezerResults, youtubeResults] = await Promise.all([
        searchDeezer(query),
        searchYouTube(query)
      ]);
      
      // 3. Pour chaque résultat Spotify, enrichir avec les autres plateformes
      const enrichedResults = await Promise.all(
        spotifyResults.map(async (spotifyArtist) => {
          // Générer les URLs de base
          const generatedUrls = generatePlatformUrls(spotifyArtist.name);
          
          // Vérifier YouTube avec l'API
          const youtubeVerification = await verifyYouTubeUrl(spotifyArtist.name);
          
          // Trouver les correspondances sur autres plateformes
          const deezerMatch = deezerResults.find(
            deezer => deezer.name.toLowerCase() === spotifyArtist.name.toLowerCase()
          );

          const youtubeMatch = youtubeResults.find(
            yt => yt.name.toLowerCase().includes(spotifyArtist.name.toLowerCase()) ||
                 spotifyArtist.name.toLowerCase().includes(yt.name.toLowerCase())
          );
          
          // Construire les statistiques par plateforme
          const platformStats = [
            {
              platform: 'Spotify',
              followers: spotifyArtist.followers?.total || 0,
              popularity: spotifyArtist.popularity || 0,
              verified: true
            }
          ];

          if (deezerMatch) {
            platformStats.push({
              platform: 'Deezer',
              followers: deezerMatch.nb_fan || 0,
              popularity: undefined, // Deezer n'a pas de score de popularité direct
              verified: true
            });
          }

          if (youtubeVerification.verified && youtubeVerification.followers) {
            platformStats.push({
              platform: 'YouTube',
              followers: youtubeVerification.followers,
              popularity: undefined,
              verified: true
            });
          }

          // Calculer les statistiques cumulées
          const { totalFollowers, averagePopularity } = calculateCumulativeStats(platformStats);
          
          const result: SmartArtistResult = {
            id: spotifyArtist.id,
            name: spotifyArtist.name,
            spotifyId: spotifyArtist.id,
            genres: spotifyArtist.genres || [],
            popularity: spotifyArtist.popularity || 0,
            followersCount: spotifyArtist.followers?.total || 0,
            profileImageUrl: spotifyArtist.images?.[0]?.url || '',
            bio: `Artiste disponible sur ${platformStats.length} plateforme${platformStats.length > 1 ? 's' : ''}`,
            
            platformUrls: {
              spotify: spotifyArtist.external_urls?.spotify || '',
              deezer: deezerMatch?.link,
              youtube: youtubeVerification.url || undefined,
              youtubeMusic: generatedUrls.youtubeMusic,
              amazonMusic: generatedUrls.amazonMusic,
            },
            
            platformStats,
            totalFollowers,
            averagePopularity
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
