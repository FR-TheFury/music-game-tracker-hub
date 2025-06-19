
import { useState } from 'react';
import { useSpotify } from './useSpotify';
import { useDeezer } from './useDeezer';
import { useYouTube } from './useYouTube';
import { useSoundCloud } from './useSoundCloud';
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
    soundcloud?: string;
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
  const { searchArtists: searchSoundCloud } = useSoundCloud();

  const generatePlatformUrls = (artistName: string) => {
    const cleanName = artistName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    
    return {
      youtubeMusic: `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`,
      amazonMusic: `https://music.amazon.com/search/${encodeURIComponent(artistName)}`,
      appleMusic: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
      tidal: `https://listen.tidal.com/search?q=${encodeURIComponent(artistName)}`,
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
    console.log('Calcul des statistiques cumulées pour:', platformStats);
    
    // Calculer le total des followers (somme directe des plateformes vérifiées)
    let totalFollowers = 0;
    let popularitySum = 0;
    let popularityCount = 0;

    platformStats.forEach(stat => {
      console.log(`Plateforme ${stat.platform}:`, {
        followers: stat.followers,
        popularity: stat.popularity,
        verified: stat.verified
      });

      // Additionner tous les followers des plateformes vérifiées
      if (stat.followers && stat.verified && stat.followers > 0) {
        totalFollowers += stat.followers;
        console.log(`Ajout de ${stat.followers} followers de ${stat.platform}`);
      }

      // Calculer la moyenne des popularités
      if (stat.popularity && stat.popularity > 0) {
        popularitySum += stat.popularity;
        popularityCount++;
      }
    });

    const averagePopularity = popularityCount > 0 ? Math.round(popularitySum / popularityCount) : 0;

    console.log('Résultat final:', {
      totalFollowers,
      averagePopularity,
      platformCount: platformStats.length
    });

    return {
      totalFollowers,
      averagePopularity
    };
  };

  const smartSearch = async (query: string): Promise<SmartArtistResult[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    try {
      console.log('Recherche intelligente pour:', query);
      
      // 1. Recherche principale sur Spotify
      const spotifyResults = await searchSpotify(query);
      console.log('Résultats Spotify:', spotifyResults.length);
      
      // 2. Recherche complémentaire sur toutes les plateformes
      const [deezerResults, youtubeResults, soundcloudResults] = await Promise.all([
        searchDeezer(query),
        searchYouTube(query),
        searchSoundCloud(query)
      ]);
      
      console.log('Résultats Deezer:', deezerResults.length);
      console.log('Résultats YouTube:', youtubeResults.length);
      console.log('Résultats SoundCloud:', soundcloudResults.length);
      
      // 3. Pour chaque résultat Spotify, enrichir avec les autres plateformes
      const enrichedResults = await Promise.all(
        spotifyResults.map(async (spotifyArtist) => {
          console.log('Enrichissement pour:', spotifyArtist.name);
          
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

          const soundcloudMatch = soundcloudResults.find(
            sc => sc.username.toLowerCase().includes(spotifyArtist.name.toLowerCase()) ||
                  spotifyArtist.name.toLowerCase().includes(sc.username.toLowerCase())
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

          if (deezerMatch && deezerMatch.nb_fan) {
            platformStats.push({
              platform: 'Deezer',
              followers: deezerMatch.nb_fan,
              popularity: undefined,
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

          if (soundcloudMatch && soundcloudMatch.followers_count) {
            platformStats.push({
              platform: 'SoundCloud',
              followers: soundcloudMatch.followers_count,
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
              soundcloud: soundcloudMatch?.permalink_url,
            },
            
            platformStats,
            totalFollowers,
            averagePopularity
          };
          
          console.log('Résultat enrichi pour', spotifyArtist.name, ':', {
            platformsCount: platformStats.length,
            totalFollowers,
            averagePopularity,
            hasSoundCloud: !!soundcloudMatch
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
