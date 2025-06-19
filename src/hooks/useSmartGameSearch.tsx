
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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

  const extractSteamAppId = (url: string): string | null => {
    const match = url.match(/\/app\/(\d+)/);
    return match ? match[1] : null;
  };

  const searchByUrl = async (url: string): Promise<GameSearchResult | null> => {
    setLoading(true);
    try {
      const platform = detectPlatformFromUrl(url);
      
      if (platform === 'Steam') {
        const appId = extractSteamAppId(url);
        if (appId) {
          // Utiliser l'API Steam Store (publique)
          const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
          const data = await response.json();
          
          if (data[appId]?.success && data[appId]?.data) {
            const gameData = data[appId].data;
            return {
              name: gameData.name,
              platform: 'Steam',
              url: url,
              imageUrl: gameData.header_image,
              price: gameData.price_overview ? `${gameData.price_overview.final_formatted}` : 'Gratuit',
              discount: gameData.price_overview?.discount_percent > 0 ? `${gameData.price_overview.discount_percent}%` : undefined,
              releaseDate: gameData.release_date?.date,
              description: gameData.short_description,
              genres: gameData.genres?.map((g: any) => g.description),
              developer: gameData.developers?.[0],
              publisher: gameData.publishers?.[0],
            };
          }
        }
      }
      
      // Pour les autres plateformes, retourner les informations de base
      return {
        name: '',
        platform: platform,
        url: url,
      };
      
    } catch (error) {
      console.error('Error searching game by URL:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les informations du jeu",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const searchByName = async (gameName: string): Promise<GameSearchResult[]> => {
    setLoading(true);
    try {
      // Utiliser l'API RAWG pour la recherche par nom
      const response = await fetch(
        `https://api.rawg.io/api/games?key=YOUR_RAWG_API_KEY&search=${encodeURIComponent(gameName)}&page_size=5`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search games');
      }
      
      const data = await response.json();
      const searchResults: GameSearchResult[] = data.results?.map((game: any) => ({
        name: game.name,
        platform: 'Multiplateforme',
        url: `https://rawg.io/games/${game.slug}`,
        imageUrl: game.background_image,
        releaseDate: game.released,
        description: game.description_raw?.substring(0, 150) + '...',
        genres: game.genres?.map((g: any) => g.name),
        rating: game.rating,
      })) || [];
      
      setResults(searchResults);
      return searchResults;
      
    } catch (error) {
      console.error('Error searching games by name:', error);
      toast({
        title: "Information",
        description: "La recherche par nom nécessite une clé API RAWG",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    results,
    searchByUrl,
    searchByName,
    detectPlatformFromUrl,
  };
};
