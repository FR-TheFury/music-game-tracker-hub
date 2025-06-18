
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, AlertCircle, Music } from 'lucide-react';
import { useSmartArtistSearch } from '@/hooks/useSmartArtistSearch';

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
  const { smartSearch, loading } = useSmartArtistSearch();

  const searchArtists = async () => {
    if (!searchQuery.trim()) return;
    
    const smartResults = await smartSearch(searchQuery);
    setResults(smartResults);
    setShowResults(true);
  };

  const selectArtist = (artist: any) => {
    // Créer les URLs multiples pour le formulaire principal
    const multipleUrls = Object.entries(artist.platformUrls)
      .filter(([_, url]) => url)
      .map(([platform, url]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        url: url as string
      }));

    const artistData = {
      name: artist.name,
      platform: 'Spotify',
      url: artist.platformUrls.spotify,
      spotifyId: artist.spotifyId,
      genres: artist.genres,
      popularity: artist.popularity,
      followersCount: artist.followersCount,
      profileImageUrl: artist.profileImageUrl,
      bio: artist.bio,
      multipleUrls,
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
    };
    
    return colors[platform] || 'bg-gray-600';
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery && searchQuery.length > 2) {
        searchArtists();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  return (
    <div className="space-y-2">
      <Label className="text-gray-300">Recherche intelligente d'artiste</Label>
      <div className="relative">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tapez le nom d'un artiste pour une recherche multi-plateformes..."
          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {showResults && results.length > 0 && (
        <div className="bg-slate-700 border border-slate-600 rounded-md max-h-64 overflow-y-auto">
          {results.map((artist, index) => (
            <div
              key={`${artist.id}-${index}`}
              onClick={() => selectArtist(artist)}
              className="p-4 hover:bg-slate-600 cursor-pointer border-b border-slate-600 last:border-b-0"
            >
              <div className="flex items-center gap-3 mb-2">
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
                  <div className="text-gray-400 text-sm">
                    {artist.followersCount ? `${Math.floor(artist.followersCount / 1000)}k followers` : ''}
                    {artist.genres && artist.genres.length > 0 && (
                      <span className="ml-2">• {artist.genres.slice(0, 2).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="text-yellow-400 text-sm">
                  ⭐ {artist.popularity || 0}
                </div>
              </div>
              
              {/* Plateformes disponibles */}
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(artist.platformUrls).map(([platform, url]) => {
                  if (!url) return null;
                  const isVerified = artist.verified[platform as keyof typeof artist.verified];
                  
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
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Badge>
                  );
                })}
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                Cliquez pour remplir automatiquement tous les champs
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showResults && results.length === 0 && !loading && (
        <div className="bg-slate-700 border border-slate-600 rounded-md p-4 text-center text-gray-400">
          Aucun artiste trouvé pour "{searchQuery}"
        </div>
      )}
    </div>
  );
};
