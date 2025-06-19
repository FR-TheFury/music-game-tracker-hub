
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

export const useSmartGameSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const { toast } = useToast();

  const detectPlatformFromUrl = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('store.steampowered.com')) return 'Steam';
    if (lowerUrl.includes('store.epicgames.com')) return 'Epic Games';
    if (lowerUrl.includes('microsoft.com') || lowerUrl.includes('xbox.com')) return 'Xbox';
    if (lowerUrl.includes('playstation.com')) return 'PlayStation';
    if (lowerUrl.includes('nintendo.com')) return 'Nintendo';
    if (lowerUrl.includes('gog.com')) return 'GOG';
    if (lowerUrl.includes('origin.com')) return 'Origin';
    if (lowerUrl.includes('ubisoft.com')) return 'Ubisoft Store';
    if (lowerUrl.includes('battle.net')) return 'Battle.net';
    return 'Autre';
  };

  const searchGames = async (query: string, platform: 'rawg' | 'steam', searchType: 'name' | 'url'): Promise<GameSearchResult[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-games', {
        body: { query, platform, searchType }
      });

      if (error) throw error;

      const searchResults = data?.results || [];
      setResults(searchResults);
      
      if (searchResults.length === 0) {
        toast({
          title: "Aucun résultat",
          description: "Aucun jeu trouvé pour cette recherche",
        });
      }
      
      return searchResults;
      
    } catch (error) {
      console.error('Error searching games:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les jeux",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const searchByUrl = async (url: string): Promise<GameSearchResult | null> => {
    const platform = detectPlatformFromUrl(url);
    
    if (platform === 'Steam') {
      const results = await searchGames(url, 'steam', 'url');
      return results[0] || null;
    }
    
    // Pour les autres plateformes, retourner les informations de base
    return {
      name: '',
      platform: platform,
      url: url,
    };
  };

  const searchByName = async (gameName: string, platform: 'rawg' = 'rawg'): Promise<GameSearchResult[]> => {
    return await searchGames(gameName, platform, 'name');
  };

  return {
    loading,
    results,
    searchByUrl,
    searchByName,
    searchGames,
    detectPlatformFromUrl,
  };
};
