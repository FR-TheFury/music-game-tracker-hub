
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, AlertCircle, Music, Play, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useSmartArtistSearch } from '@/hooks/useSmartArtistSearch';
import { PlatformSelector, type PlatformConfig } from './PlatformSelector';

interface SmartArtistSearchProps {
  onArtistSelect: (artistData: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const SmartArtistSearch: React.FC<SmartArtistSearchProps> = ({
  onArtistSelect,
  searchQuery,
  setSearchQuery
}) => {
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<PlatformConfig>({
    spotify: true,
    deezer: true,
    youtube: false, // Désactivé par défaut pour la performance
    soundcloud: false // Désactivé par défaut pour éviter le rate limiting
  });
  const { smartSearch, loading } = useSmartArtistSearch();

  const searchArtists = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) return;
    
    setSearchError(null);
    console.log('Recherche optimisée pour:', searchQuery, 'Plateformes:', platforms);
    
    try {
      const smartResults = await smartSearch(searchQuery, platforms);
      console.log('Résultats de recherche:', smartResults);
      
      setResults(smartResults);
      setShowResults(true);
      
      if (smartResults.length === 0) {
        setSearchError('Aucun artiste trouvé sur les plateformes sélectionnées');
      }
    } catch (error) {
      console.error('Erreur de recherche:', error);
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.');
      setResults([]);
      setShowResults(true);
    }
  };

  const selectArtist = (artist: any) => {
    console.log('Sélection de l\'artiste:', artist);
    
    const platformUrls = artist.platformUrls || {};
    
    const multipleUrls = Object.entries(platformUrls)
      .filter(([_, url]) => url)
      .map(([platform, url]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        url: url as string
      }));

    const artistData = {
      name: artist.name,
      platform: 'Spotify',
      url: platformUrls.spotify || '',
      spotifyId: artist.spotifyId,
      genres: artist.genres,
      popularity: artist.popularity,
      followersCount: artist.followersCount,
      profileImageUrl: artist.profileImageUrl,
      bio: artist.bio,
      multipleUrls,
      totalFollowers: artist.totalFollowers,
      averagePopularity: artist.averagePopularity,
      totalPlays: artist.totalPlays,
      platformStats: artist.platformStats,
    };

    console.log('Données artiste sélectionnées:', artistData);
    
    onArtistSelect(artistData);
    setShowResults(false);
    setSearchQuery(artist.name);
  };

  const getPlatformColor = (platform: string, verified: boolean) => {
    if (!verified) return 'bg-gray-500';
    
    const colors: Record<string, string> = {
      spotify: 'bg-green-600',
      deezer: 'bg-orange-600',
      youtube: 'bg-red-600',
      youtubeMusic: 'bg-red-700',
      amazonMusic: 'bg-blue-600',
      soundcloud: 'bg-orange-500',
    };
    
    return colors[platform] || 'bg-gray-600';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Délai de recherche optimisé
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery && searchQuery.length >= 3) {
        const enabledCount = Object.values(platforms).filter(Boolean).length;
        if (enabledCount > 0) {
          searchArtists();
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 800); // Délai augmenté pour éviter trop de requêtes

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, platforms]);

  const enabledPlatformsCount = Object.values(platforms).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <Label className="text-gray-300">Recherche intelligente d'artiste (optimisée)</Label>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tapez au moins 3 caractères..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 pr-10"
              disabled={enabledPlatformsCount === 0}
              minLength={3}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <Search className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
          {searchQuery.length > 0 && searchQuery.length < 3 && (
            <div className="text-sm text-yellow-400">
              Tapez au moins 3 caractères pour commencer la recherche
            </div>
          )}
          {searchError && (
            <div className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {searchError}
            </div>
          )}
        </div>
        
        <PlatformSelector
          platforms={platforms}
          onPlatformChange={setPlatforms}
          className="lg:row-start-1"
        />
      </div>

      {/* Info sur la recherche optimisée */}
      <div className="bg-blue-500/10 border border-blue-400/20 rounded-md p-3 text-sm text-blue-400">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="font-medium">Recherche optimisée</span>
        </div>
        <p className="mt-1 text-blue-300">
          Priorité donnée à Spotify et Deezer pour une recherche plus rapide. 
          YouTube et SoundCloud disponibles mais peuvent ralentir la recherche.
        </p>
      </div>
      
      {showResults && results.length > 0 && (
        <div className="bg-slate-700 border border-slate-600 rounded-md max-h-96 overflow-y-auto">
          {results.map((artist, index) => (
            <div
              key={`${artist.id}-${index}`}
              onClick={() => selectArtist(artist)}
              className="p-4 hover:bg-slate-600 cursor-pointer border-b border-slate-600 last:border-b-0"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  {artist.profileImageUrl ? (
                    <img 
                      src={artist.profileImageUrl} 
                      alt={artist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                      <Music className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">{artist.name}</div>
                  <div className="text-gray-400 text-sm flex items-center gap-2 flex-wrap">
                    {artist.totalFollowers > 0 && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatNumber(artist.totalFollowers)} followers total
                      </span>
                    )}
                    {artist.genres && artist.genres.length > 0 && (
                      <span>• {artist.genres.slice(0, 2).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="text-yellow-400 text-sm">
                  ⭐ {artist.averagePopularity || artist.popularity || 0}
                </div>
              </div>
              
              {/* Plateformes disponibles */}
              <div className="flex flex-wrap gap-1 mt-2">
                {artist.platformUrls && Object.entries(artist.platformUrls).map(([platform, url]) => {
                  if (!url) return null;
                  const platformStat = artist.platformStats?.find((stat: any) => 
                    stat.platform.toLowerCase() === platform.toLowerCase()
                  );
                  const isVerified = platformStat?.verified || false;
                  
                  return (
                    <Badge
                      key={platform}
                      className={`${getPlatformColor(platform, isVerified)} text-white text-xs flex items-center gap-1`}
                    >
                      <div title={isVerified ? 'Vérifié' : 'URL générée'}>
                        {isVerified ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Wifi className="h-3 w-3" />
                        )}
                      </div>
                      {platform === 'youtubeMusic' ? 'YT Music' : 
                       platform === 'amazonMusic' ? 'Amazon' :
                       platform.charAt(0).toUpperCase() + platform.slice(1)}
                      {platformStat?.followers && (
                        <span className="ml-1">({formatNumber(platformStat.followers)})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              
              <div className="text-xs text-gray-500 mt-2">
                Cliquez pour remplir automatiquement • {artist.platformStats?.length || 1} plateforme{(artist.platformStats?.length || 1) > 1 ? 's' : ''} vérifiée{(artist.platformStats?.length || 1) > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showResults && results.length === 0 && !loading && enabledPlatformsCount > 0 && !searchError && searchQuery.length >= 3 && (
        <div className="bg-slate-700 border border-slate-600 rounded-md p-4 text-center text-gray-400">
          Aucun artiste trouvé pour "{searchQuery}" sur les plateformes sélectionnées
        </div>
      )}
      
      {enabledPlatformsCount === 0 && searchQuery && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-md p-4 text-center text-yellow-400">
          Sélectionnez au moins une plateforme pour effectuer une recherche
        </div>
      )}
    </div>
  );
};
