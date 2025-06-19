
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, AlertCircle, Music, Play, TrendingUp, Calendar } from 'lucide-react';
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
  const [platforms, setPlatforms] = useState<PlatformConfig>({
    spotify: true,
    deezer: true,
    youtube: true,
    soundcloud: true
  });
  const { smartSearch, loading } = useSmartArtistSearch();

  const searchArtists = async () => {
    if (!searchQuery.trim()) return;
    
    const smartResults = await smartSearch(searchQuery, platforms);
    setResults(smartResults);
    setShowResults(true);
  };

  const selectArtist = (artist: any) => {
    // Ensure platformUrls exists and has valid data
    const platformUrls = artist.platformUrls || {};
    
    // Créer les URLs multiples pour le formulaire principal
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
      // Nouvelles propriétés cumulées
      totalFollowers: artist.totalFollowers,
      averagePopularity: artist.averagePopularity,
      totalPlays: artist.totalPlays,
      platformStats: artist.platformStats,
    };

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

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery && searchQuery.length > 2) {
        const enabledCount = Object.values(platforms).filter(Boolean).length;
        if (enabledCount > 0) {
          searchArtists();
        }
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, platforms]);

  const enabledPlatformsCount = Object.values(platforms).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <Label className="text-gray-300">Recherche intelligente d'artiste</Label>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tapez le nom d'un artiste pour une recherche multi-plateformes..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 pr-10"
              disabled={enabledPlatformsCount === 0}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <Search className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>
        
        <PlatformSelector
          platforms={platforms}
          onPlatformChange={setPlatforms}
          className="lg:row-start-1"
        />
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
                    {artist.totalPlays > 0 && (
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {formatNumber(artist.totalPlays)} écoutes
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
              
              {/* Nouvelles sorties récentes */}
              {artist.recentReleases && artist.recentReleases.length > 0 && (
                <div className="mb-2 p-2 bg-slate-800/50 rounded">
                  <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Sorties récentes ({artist.recentReleases.length})
                  </div>
                  <div className="text-xs text-gray-300">
                    {artist.recentReleases.slice(0, 2).map((release: any, idx: number) => (
                      <div key={idx} className="truncate">
                        • {release.title} ({release.platform})
                        {release.plays && <span className="text-gray-500"> - {formatNumber(release.plays)} écoutes</span>}
                      </div>
                    ))}
                    {artist.recentReleases.length > 2 && (
                      <div className="text-gray-500">+{artist.recentReleases.length - 2} autres...</div>
                    )}
                  </div>
                </div>
              )}
              
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
                      {isVerified ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
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
                Cliquez pour remplir automatiquement tous les champs • {artist.platformStats?.length || 1} plateforme{(artist.platformStats?.length || 1) > 1 ? 's' : ''} détectée{(artist.platformStats?.length || 1) > 1 ? 's' : ''}
                {artist.totalPlays > 0 && <span> • {formatNumber(artist.totalPlays)} écoutes cumulées</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showResults && results.length === 0 && !loading && enabledPlatformsCount > 0 && (
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
