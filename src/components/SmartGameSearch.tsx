
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, Loader2, Plus, Link, Gamepad2 } from 'lucide-react';
import { useSmartGameSearch } from '@/hooks/useSmartGameSearch';

interface GameSearchResult {
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  price?: string;
  discount?: string;
  releaseDate?: string;
  description?: string;
  genres?: string[];
  developer?: string;
  publisher?: string;
  rating?: number;
}

interface SmartGameSearchProps {
  onSelectGame: (game: GameSearchResult) => void;
  className?: string;
}

export const SmartGameSearch: React.FC<SmartGameSearchProps> = ({ 
  onSelectGame, 
  className = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'url'>('name');
  const [searchPlatform, setSearchPlatform] = useState<'rawg' | 'steam'>('rawg');
  const { loading, results, searchByUrl, searchGames, detectPlatformFromUrl } = useSmartGameSearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    if (searchType === 'url') {
      const result = await searchByUrl(searchQuery);
      if (result) {
        onSelectGame(result);
      }
    } else {
      await searchGames(searchQuery, searchPlatform, 'name');
    }
  };

  const isUrl = (query: string) => {
    try {
      new URL(query);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const newSearchType = isUrl(searchQuery) ? 'url' : 'name';
    setSearchType(newSearchType);
    
    // Auto-détecter Steam pour les URLs Steam
    if (newSearchType === 'url' && searchQuery.includes('store.steampowered.com')) {
      setSearchPlatform('steam');
    }
  }, [searchQuery]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className={`bg-slate-800/70 border-blue-500/30 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Search className="h-5 w-5 text-blue-400" />
          Recherche Intelligente de Jeux
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={searchType === 'url' ? 'Collez l\'URL du jeu...' : 'Nom du jeu...'}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 pl-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {searchType === 'url' ? (
                <Link className="h-4 w-4 text-blue-400" />
              ) : (
                <Gamepad2 className="h-4 w-4 text-blue-400" />
              )}
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`border-blue-400 text-blue-400 ${searchType === 'url' ? 'bg-blue-400/10' : ''}`}>
            {searchType === 'url' ? 'URL détectée' : 'Recherche par nom'}
          </Badge>
          
          {searchType === 'url' && searchQuery && (
            <Badge variant="outline" className="border-green-400 text-green-400">
              {detectPlatformFromUrl(searchQuery)}
            </Badge>
          )}

          {searchType === 'name' && (
            <Select value={searchPlatform} onValueChange={(value: 'rawg' | 'steam') => setSearchPlatform(value)}>
              <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="rawg" className="text-white hover:bg-slate-700">
                  RAWG
                </SelectItem>
                <SelectItem value="steam" className="text-white hover:bg-slate-700">
                  Steam
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {searchType === 'name' && results.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((game, index) => (
              <div
                key={index}
                className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:bg-slate-700/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {game.imageUrl ? (
                    <img
                      src={game.imageUrl}
                      alt={game.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Gamepad2 className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{game.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-blue-400 text-blue-400 bg-blue-400/10 text-xs">
                        {game.platform}
                      </Badge>
                      {game.rating && (
                        <Badge variant="outline" className="border-yellow-400 text-yellow-400 bg-yellow-400/10 text-xs">
                          ⭐ {game.rating}
                        </Badge>
                      )}
                    </div>
                    {game.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{game.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">
                        {game.releaseDate && `Sortie: ${game.releaseDate}`}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onSelectGame(game)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Sélectionner
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
