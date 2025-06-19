
import { useState, useCallback } from 'react';
import { useSoundCloud } from './useSoundCloud';

interface SoundCloudStats {
  totalPlays: number;
  totalLikes: number;
  trackCount: number;
  lastUpdated: string;
}

export const useArtistSoundCloudStats = () => {
  const [statsCache, setStatsCache] = useState<Map<string, SoundCloudStats>>(new Map());
  const [loading, setLoading] = useState(false);
  const { getPlaybackStats } = useSoundCloud();

  const getSoundCloudUrl = useCallback((artist: any) => {
    if (artist?.multipleUrls) {
      const soundcloudLink = artist.multipleUrls.find((link: any) => 
        link.platform?.toLowerCase().includes('soundcloud') || 
        link.url?.toLowerCase().includes('soundcloud')
      );
      return soundcloudLink?.url;
    }
    return undefined;
  }, []);

  const fetchArtistStats = useCallback(async (artistName: string, artistData?: any): Promise<SoundCloudStats | null> => {
    const cacheKey = `${artistName}-${artistData?.id || ''}`;
    
    // Vérifier le cache (valide pour 1 heure)
    const cached = statsCache.get(cacheKey);
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
      if (cacheAge < 3600000) { // 1 heure en ms
        return cached;
      }
    }

    try {
      setLoading(true);
      const soundcloudUrl = getSoundCloudUrl(artistData);
      
      console.log(`Récupération stats SoundCloud pour ${artistName}`, { soundcloudUrl });
      
      const stats = await getPlaybackStats(artistName, soundcloudUrl);
      
      if (stats) {
        const soundcloudStats: SoundCloudStats = {
          totalPlays: stats.totalPlays,
          totalLikes: stats.totalLikes,
          trackCount: stats.trackCount,
          lastUpdated: new Date().toISOString()
        };
        
        // Mettre en cache
        setStatsCache(prev => new Map(prev.set(cacheKey, soundcloudStats)));
        
        console.log(`Stats SoundCloud récupérées pour ${artistName}:`, soundcloudStats);
        return soundcloudStats;
      }
      
      return null;
    } catch (error) {
      console.error(`Erreur récupération stats SoundCloud pour ${artistName}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getPlaybackStats, getSoundCloudUrl, statsCache]);

  const updateArtistWithStats = useCallback(async (artist: any) => {
    const stats = await fetchArtistStats(artist.name, artist);
    if (stats) {
      return {
        ...artist,
        soundcloudStats: stats
      };
    }
    return artist;
  }, [fetchArtistStats]);

  return {
    fetchArtistStats,
    updateArtistWithStats,
    loading,
    statsCache
  };
};
