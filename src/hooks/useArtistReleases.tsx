
import { useState, useEffect } from 'react';
import { useNewReleases } from './useNewReleases';

interface ArtistRelease {
  id: string;
  type: 'artist' | 'game';
  sourceItemId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  platformUrl?: string;
  detectedAt: string;
  expiresAt: string;
  userId: string;
  platform?: string;
}

export const useArtistReleases = (artistId: string) => {
  const { releases: allReleases, loading } = useNewReleases();
  const [artistReleases, setArtistReleases] = useState<ArtistRelease[]>([]);

  useEffect(() => {
    console.log('useArtistReleases - artistId:', artistId);
    console.log('useArtistReleases - allReleases:', allReleases);

    if (!artistId || !allReleases) {
      console.log('useArtistReleases - Missing data, artistId:', artistId, 'allReleases:', allReleases);
      return;
    }

    // Filtrer les sorties pour cet artiste spécifique
    const filteredReleases = allReleases.filter(release => {
      console.log('Checking release:', release.sourceItemId, 'against artistId:', artistId);
      return release.type === 'artist' && release.sourceItemId === artistId;
    });

    console.log('Filtered releases for artist:', filteredReleases);

    // Filtrer par date (moins d'un mois)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentReleases = filteredReleases.filter(release => {
      const releaseDate = new Date(release.detectedAt);
      return releaseDate > oneMonthAgo;
    });

    console.log('Recent releases (last month):', recentReleases);
    setArtistReleases(recentReleases);
  }, [artistId, allReleases]);

  const filterByPlatforms = (platforms: Array<{ platform: string; url: string }>) => {
    if (!platforms || platforms.length === 0) return artistReleases;

    const platformNames = platforms.map(p => p.platform.toLowerCase());
    
    return artistReleases.filter(release => {
      if (!release.platformUrl) return true;
      
      // Détection de plateforme basée sur l'URL
      const url = release.platformUrl.toLowerCase();
      return platformNames.some(platform => {
        if (platform.includes('spotify') && url.includes('spotify')) return true;
        if (platform.includes('soundcloud') && url.includes('soundcloud')) return true;
        if (platform.includes('youtube') && url.includes('youtube')) return true;
        if (platform.includes('apple') && url.includes('apple')) return true;
        if (platform.includes('deezer') && url.includes('deezer')) return true;
        return false;
      });
    });
  };

  return {
    artistReleases,
    loading,
    filterByPlatforms,
  };
};

// Keep the original export for backward compatibility
export const useArtistReleasesData = () => {
  const getArtistReleases = async (artistId: string) => {
    console.log('getArtistReleases called with artistId:', artistId);
    // Implementation moved to useArtists hook
    return [];
  };

  return { getArtistReleases };
};
