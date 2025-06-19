
import { useState } from 'react';
import { useSpotify } from './useSpotify';
import { useDeezer } from './useDeezer';
import { useYouTube } from './useYouTube';
import { useSoundCloud } from './useSoundCloud';
import { supabase } from '@/integrations/supabase/client';
import type { PlatformConfig } from '@/components/PlatformSelector';

interface SmartArtistResult {
  id: string;
  name: string;
  spotifyId: string;
  genres: string[];
  popularity: number;
  followersCount: number;
  profileImageUrl: string;
  bio?: string;
  
  platformUrls: {
    spotify: string;
    deezer?: string;
    youtube?: string;
    youtubeMusic?: string;
    amazonMusic?: string;
    soundcloud?: string;
  };
  
  platformStats: Array<{
    platform: string;
    followers?: number;
    popularity?: number;
    verified: boolean;
    totalPlays?: number;
    recentReleases?: number;
  }>;
  
  totalFollowers: number;
  averagePopularity: number;
  totalPlays: number;
  recentReleases: Array<{
    platform: string;
    title: string;
    url: string;
    date: string;
    plays?: number;
  }>;
}

export const useSmartArtistSearch = () => {
  const [loading, setLoading] = useState(false);
  const { searchArtists: searchSpotify } = useSpotify();
  const { searchArtists: searchDeezer } = useDeezer();

  const generatePlatformUrls = (artistName: string) => {
    const cleanName = artistName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    
    return {
      youtubeMusic: `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`,
      amazonMusic: `https://music.amazon.com/search/${encodeURIComponent(artistName)}`,
      appleMusic: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
      tidal: `https://listen.tidal.com/search?q=${encodeURIComponent(artistName)}`,
    };
  };

  const verifyYouTubeUrl = async (artistName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-youtube-info', {
        body: { artistName, type: 'generateUrl' }
      });
      
      if (error || !data) {
        return { url: null, verified: false };
      }
      
      return { 
        url: data.url, 
        verified: data.verified || false,
        followers: data.subscriberCount
      };
    } catch (error) {
      console.error('YouTube verification error:', error);
      return { url: null, verified: false };
    }
  };

  const calculateCumulativeStats = (platformStats: Array<{
    platform: string;
    followers?: number;
    popularity?: number;
    verified: boolean;
    totalPlays?: number;
  }>) => {
    let totalFollowers = 0;
    let totalPlays = 0;
    let popularitySum = 0;
    let popularityCount = 0;

    platformStats.forEach(stat => {
      if (stat.followers && stat.verified && stat.followers > 0) {
        totalFollowers += stat.followers;
      }

      if (stat.totalPlays && stat.totalPlays > 0) {
        totalPlays += stat.totalPlays;
      }

      if (stat.popularity && stat.popularity > 0) {
        popularitySum += stat.popularity;
        popularityCount++;
      }
    });

    const averagePopularity = popularityCount > 0 ? Math.round(popularitySum / popularityCount) : 0;

    return {
      totalFollowers,
      totalPlays,
      averagePopularity
    };
  };

  const smartSearch = async (query: string, enabledPlatforms: PlatformConfig): Promise<SmartArtistResult[]> => {
    if (!query.trim()) return [];
    
    const enabledCount = Object.values(enabledPlatforms).filter(Boolean).length;
    if (enabledCount === 0) {
      console.log('Aucune plateforme sélectionnée');
      return [];
    }
    
    setLoading(true);
    try {
      console.log('Recherche optimisée pour:', query);
      
      // Prioriser Spotify et Deezer car ils sont plus fiables
      const searchPromises = [];
      
      if (enabledPlatforms.spotify) {
        searchPromises.push(
          searchSpotify(query)
            .then(results => ({ platform: 'spotify', results }))
            .catch(error => {
              console.error('Spotify search error:', error);
              return { platform: 'spotify', results: [] };
            })
        );
      }
      
      if (enabledPlatforms.deezer) {
        searchPromises.push(
          searchDeezer(query)
            .then(results => ({ platform: 'deezer', results }))
            .catch(error => {
              console.error('Deezer search error:', error);
              return { platform: 'deezer', results: [] };
            })
        );
      }

      // Attendre seulement les recherches principales (Spotify + Deezer)
      const searchResults = await Promise.all(searchPromises);
      
      console.log('Résultats obtenus:', searchResults.map(r => `${r.platform}: ${r.results.length}`));
      
      // Utiliser Spotify comme base, sinon Deezer
      let baseResults = [];
      const spotifyData = searchResults.find(r => r.platform === 'spotify');
      if (spotifyData && spotifyData.results.length > 0) {
        baseResults = spotifyData.results.slice(0, 3); // Limiter à 3 pour la performance
      } else {
        const deezerData = searchResults.find(r => r.platform === 'deezer');
        if (deezerData && deezerData.results.length > 0) {
          baseResults = deezerData.results.slice(0, 3);
        }
      }

      if (baseResults.length === 0) {
        console.log('Aucun résultat trouvé');
        return [];
      }

      // Enrichir les résultats de manière séquentielle pour éviter le rate limiting
      const enrichedResults = await Promise.all(
        baseResults.map(async (baseArtist, index) => {
          console.log('Enrichissement pour:', baseArtist.name || baseArtist.username);
          
          const generatedUrls = generatePlatformUrls(baseArtist.name || baseArtist.username);
          
          // Vérification YouTube seulement si activée et de manière limitée
          let youtubeVerification = { url: null, verified: false, followers: undefined };
          if (enabledPlatforms.youtube && index === 0) { // Seulement pour le premier résultat
            try {
              youtubeVerification = await verifyYouTubeUrl(baseArtist.name || baseArtist.username);
            } catch (error) {
              console.error('YouTube verification failed:', error);
            }
          }
          
          // Trouver les correspondances Deezer
          const deezerResults = searchResults.find(r => r.platform === 'deezer')?.results || [];
          const deezerMatch = deezerResults.find(
            deezer => deezer.name.toLowerCase() === (baseArtist.name || baseArtist.username).toLowerCase()
          );
          
          // Construire les statistiques par plateforme
          const platformStats = [];

          // Spotify
          if (baseArtist.followers && baseArtist.followers.total !== undefined) {
            platformStats.push({
              platform: 'Spotify',
              followers: baseArtist.followers.total,
              popularity: baseArtist.popularity || 0,
              verified: true
            });
          }

          // Deezer
          if (deezerMatch && deezerMatch.nb_fan) {
            platformStats.push({
              platform: 'Deezer',
              followers: deezerMatch.nb_fan,
              verified: true
            });
          }

          // YouTube (seulement si vérifié)
          if (youtubeVerification.verified && youtubeVerification.followers) {
            platformStats.push({
              platform: 'YouTube',
              followers: youtubeVerification.followers,
              verified: true
            });
          }

          const { totalFollowers, totalPlays, averagePopularity } = calculateCumulativeStats(platformStats);
          
          const result: SmartArtistResult = {
            id: baseArtist.id || `enriched-${index}`,
            name: baseArtist.name || baseArtist.username,
            spotifyId: baseArtist.id || '',
            genres: baseArtist.genres || [],
            popularity: baseArtist.popularity || 0,
            followersCount: baseArtist.followers?.total || baseArtist.followers_count || 0,
            profileImageUrl: baseArtist.images?.[0]?.url || baseArtist.avatar_url || '',
            bio: `Artiste disponible sur ${platformStats.length} plateforme${platformStats.length > 1 ? 's' : ''}`,
            
            platformUrls: {
              spotify: baseArtist.external_urls?.spotify || '',
              deezer: deezerMatch?.link,
              youtube: youtubeVerification.url || undefined,
              youtubeMusic: generatedUrls.youtubeMusic,
              amazonMusic: generatedUrls.amazonMusic,
            },
            
            platformStats,
            totalFollowers,
            totalPlays,
            averagePopularity,
            recentReleases: []
          };
          
          console.log('Résultat enrichi:', baseArtist.name, {
            platformsCount: platformStats.length,
            totalFollowers,
            averagePopularity
          });
          
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
