
import { useState, useCallback } from 'react';
import { useSoundCloud } from '@/hooks/useSoundCloud';
import { Artist } from '@/types/artist';

interface SoundCloudEnrichmentCache {
  [artistId: string]: {
    data: any;
    timestamp: number;
  };
}

export const useSoundCloudEnrichment = () => {
  const { getPlaybackStats } = useSoundCloud();
  const [enrichmentCache, setEnrichmentCache] = useState<SoundCloudEnrichmentCache>({});
  const [loadingStates, setLoadingStates] = useState<{ [artistId: string]: boolean }>({});

  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const getSoundCloudUrl = useCallback((artist: Artist) => {
    if (artist?.multipleUrls) {
      const soundcloudLink = artist.multipleUrls.find((link: any) => 
        link.platform?.toLowerCase().includes('soundcloud') || 
        link.url?.toLowerCase().includes('soundcloud')
      );
      return soundcloudLink?.url;
    }
    return undefined;
  }, []);

  const enrichArtistWithSoundCloud = useCallback(async (artist: Artist) => {
    const artistId = artist.id;
    
    // Vérifier le cache
    const cached = enrichmentCache[artistId];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached SoundCloud data for', artist.name);
      return {
        ...artist,
        soundcloudStats: cached.data
      };
    }

    // Vérifier si l'artiste a SoundCloud
    const soundcloudUrl = getSoundCloudUrl(artist);
    if (!soundcloudUrl) {
      return artist;
    }

    // Vérifier si un chargement est déjà en cours
    if (loadingStates[artistId]) {
      return artist;
    }

    setLoadingStates(prev => ({ ...prev, [artistId]: true }));

    try {
      console.log('Enriching SoundCloud stats for:', artist.name);
      
      const stats = await getPlaybackStats(artist.name, soundcloudUrl);
      
      if (stats && stats.totalPlays > 0) {
        const soundcloudStats = {
          totalPlays: stats.totalPlays,
          totalLikes: stats.totalLikes,
          trackCount: stats.trackCount,
          lastUpdated: new Date().toISOString()
        };

        // Mettre en cache
        setEnrichmentCache(prev => ({
          ...prev,
          [artistId]: {
            data: soundcloudStats,
            timestamp: Date.now()
          }
        }));

        return {
          ...artist,
          soundcloudStats
        };
      }
    } catch (error) {
      console.error(`Erreur enrichissement SoundCloud pour ${artist.name}:`, error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [artistId]: false }));
    }

    return artist;
  }, [getPlaybackStats, enrichmentCache, loadingStates, getSoundCloudUrl]);

  const isEnriching = useCallback((artistId: string) => {
    return loadingStates[artistId] || false;
  }, [loadingStates]);

  const clearCache = useCallback(() => {
    setEnrichmentCache({});
  }, []);

  return {
    enrichArtistWithSoundCloud,
    isEnriching,
    clearCache
  };
};
