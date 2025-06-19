
import { useState } from 'react';
import { useSpotify } from './useSpotify';
import { useDeezer } from './useDeezer';
import { useYouTube } from './useYouTube';
import { useSoundCloud } from './useSoundCloud';
import { supabase } from '@/integrations/supabase/client';
import type { PlatformConfig } from '@/components/PlatformSelector';

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
    totalPlays?: number;
    recentReleases?: number;
  }>;
  
  // Statistiques cumulées
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

interface YouTubeVerificationResult {
  url: string | null;
  verified: boolean;
  followers?: number;
}

export const useSmartArtistSearch = () => {
  const [loading, setLoading] = useState(false);
  const { searchArtists: searchSpotify } = useSpotify();
  const { searchArtists: searchDeezer } = useDeezer();
  const { searchArtists: searchYouTube } = useYouTube();
  const { searchArtists: searchSoundCloud, getPlaybackStats, getArtistReleases } = useSoundCloud();

  const generatePlatformUrls = (artistName: string) => {
    const cleanName = artistName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    
    return {
      youtubeMusic: `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`,
      amazonMusic: `https://music.amazon.com/search/${encodeURIComponent(artistName)}`,
      appleMusic: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
      tidal: `https://listen.tidal.com/search?q=${encodeURIComponent(artistName)}`,
    };
  };

  const verifyYouTubeUrl = async (artistName: string): Promise<YouTubeVerificationResult> => {
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
    totalPlays?: number;
  }>) => {
    console.log('Calcul des statistiques cumulées pour:', platformStats);
    
    let totalFollowers = 0;
    let totalPlays = 0;
    let popularitySum = 0;
    let popularityCount = 0;

    platformStats.forEach(stat => {
      console.log(`Plateforme ${stat.platform}:`, {
        followers: stat.followers,
        popularity: stat.popularity,
        totalPlays: stat.totalPlays,
        verified: stat.verified
      });

      // Additionner tous les followers des plateformes vérifiées
      if (stat.followers && stat.verified && stat.followers > 0) {
        totalFollowers += stat.followers;
        console.log(`Ajout de ${stat.followers} followers de ${stat.platform}`);
      }

      // Additionner toutes les écoutes
      if (stat.totalPlays && stat.totalPlays > 0) {
        totalPlays += stat.totalPlays;
        console.log(`Ajout de ${stat.totalPlays} écoutes de ${stat.platform}`);
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
      totalPlays,
      averagePopularity,
      platformCount: platformStats.length
    });

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
      console.log('Recherche intelligente pour:', query, 'Plateformes:', enabledPlatforms);
      
      // 1. Recherches en parallèle selon les plateformes activées
      const searchPromises = [];
      
      if (enabledPlatforms.spotify) {
        searchPromises.push(searchSpotify(query).then(results => ({ platform: 'spotify', results })));
      }
      
      if (enabledPlatforms.deezer) {
        searchPromises.push(searchDeezer(query).then(results => ({ platform: 'deezer', results })));
      }
      
      if (enabledPlatforms.youtube) {
        searchPromises.push(searchYouTube(query).then(results => ({ platform: 'youtube', results })));
      }
      
      if (enabledPlatforms.soundcloud) {
        searchPromises.push(searchSoundCloud(query).then(results => ({ platform: 'soundcloud', results })));
      }

      const searchResults = await Promise.all(searchPromises);
      
      console.log('Résultats par plateforme:', searchResults.map(r => `${r.platform}: ${r.results.length}`));
      
      // 2. Utiliser Spotify comme base si disponible, sinon la première plateforme avec des résultats
      let baseResults = [];
      let spotifyResults = [];
      
      const spotifyData = searchResults.find(r => r.platform === 'spotify');
      if (spotifyData && spotifyData.results.length > 0) {
        baseResults = spotifyData.results;
        spotifyResults = spotifyData.results;
      } else {
        // Prendre la première plateforme avec des résultats comme base
        const firstPlatformWithResults = searchResults.find(r => r.results.length > 0);
        if (firstPlatformWithResults) {
          baseResults = firstPlatformWithResults.results.slice(0, 5); // Limiter à 5 résultats max
        }
      }

      if (baseResults.length === 0) {
        console.log('Aucun résultat trouvé sur les plateformes sélectionnées');
        return [];
      }

      // 3. Pour chaque résultat de base, enrichir avec les autres plateformes
      const enrichedResults = await Promise.all(
        baseResults.map(async (baseArtist, index) => {
          console.log('Enrichissement pour:', baseArtist.name || baseArtist.username);
          
          // Générer les URLs de base
          const generatedUrls = generatePlatformUrls(baseArtist.name || baseArtist.username);
          
          // Vérifier YouTube avec l'API si activé
          let youtubeVerification: YouTubeVerificationResult = { url: null, verified: false };
          if (enabledPlatforms.youtube) {
            youtubeVerification = await verifyYouTubeUrl(baseArtist.name || baseArtist.username);
          }
          
          // Trouver les correspondances sur autres plateformes
          const deezerResults = searchResults.find(r => r.platform === 'deezer')?.results || [];
          const youtubeResults = searchResults.find(r => r.platform === 'youtube')?.results || [];
          const soundcloudResults = searchResults.find(r => r.platform === 'soundcloud')?.results || [];

          const deezerMatch = deezerResults.find(
            deezer => deezer.name.toLowerCase() === (baseArtist.name || baseArtist.username).toLowerCase()
          );

          const youtubeMatch = youtubeResults.find(
            yt => yt.name.toLowerCase().includes((baseArtist.name || baseArtist.username).toLowerCase()) ||
                 (baseArtist.name || baseArtist.username).toLowerCase().includes(yt.name.toLowerCase())
          );

          const soundcloudMatch = soundcloudResults.find(
            sc => sc.username.toLowerCase().includes((baseArtist.name || baseArtist.username).toLowerCase()) ||
                  (baseArtist.name || baseArtist.username).toLowerCase().includes(sc.username.toLowerCase())
          );
          
          // Récupérer les statistiques SoundCloud avancées si disponible
          let soundcloudStats = null;
          let soundcloudReleases = [];
          if (soundcloudMatch) {
            soundcloudStats = await getPlaybackStats(soundcloudMatch.id.toString(), soundcloudMatch.permalink_url);
            soundcloudReleases = await getArtistReleases(soundcloudMatch.id.toString(), soundcloudMatch.permalink_url, 5);
          }
          
          // Construire les statistiques par plateforme
          const platformStats = [];

          // Spotify (si c'est la base ou disponible)
          if (baseArtist.followers && baseArtist.followers.total !== undefined) {
            platformStats.push({
              platform: 'Spotify',
              followers: baseArtist.followers.total,
              popularity: baseArtist.popularity || 0,
              verified: true
            });
          }

          if (deezerMatch && deezerMatch.nb_fan) {
            platformStats.push({
              platform: 'Deezer',
              followers: deezerMatch.nb_fan,
              verified: true
            });
          }

          if (youtubeVerification.verified && youtubeVerification.followers) {
            platformStats.push({
              platform: 'YouTube',
              followers: youtubeVerification.followers,
              verified: true
            });
          }

          if (soundcloudMatch) {
            platformStats.push({
              platform: 'SoundCloud',
              followers: soundcloudMatch.followers_count || 0,
              verified: true,
              totalPlays: soundcloudStats?.totalPlays || 0,
              recentReleases: soundcloudReleases.length
            });
          }

          // Calculer les statistiques cumulées
          const { totalFollowers, totalPlays, averagePopularity } = calculateCumulativeStats(platformStats);
          
          //Construire les nouvelles sorties récentes
          const recentReleases = [];
          
          if (soundcloudReleases.length > 0) {
            soundcloudReleases.forEach(release => {
              recentReleases.push({
                platform: 'SoundCloud',
                title: release.title,
                url: release.permalink_url,
                date: release.created_at,
                plays: release.playback_count
              });
            });
          }
          
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
              soundcloud: soundcloudMatch?.permalink_url,
            },
            
            platformStats,
            totalFollowers,
            totalPlays,
            averagePopularity,
            recentReleases
          };
          
          console.log('Résultat enrichi pour', baseArtist.name || baseArtist.username, ':', {
            platformsCount: platformStats.length,
            totalFollowers,
            totalPlays,
            averagePopularity,
            recentReleasesCount: recentReleases.length
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
