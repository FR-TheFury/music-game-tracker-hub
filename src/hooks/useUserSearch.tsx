
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SearchUser {
  user_id: string;
  username: string;
  role: string;
  created_at: string;
}

export interface UserArtist {
  id: string;
  name: string;
  platform: string;
  url: string;
  image_url: string;
  spotify_id: string;
  followers_count: number;
  popularity: number;
  created_at: string;
}

export interface UserGame {
  id: string;
  name: string;
  platform: string;
  url: string;
  image_url: string;
  price: string;
  discount: string;
  release_date: string;
  created_at: string;
}

export const useUserSearch = () => {
  const { toast } = useToast();
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [userArtists, setUserArtists] = useState<UserArtist[]>([]);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_users_by_username', {
        search_term: searchTerm
      });

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserData = async (userId: string) => {
    setLoadingUserData(true);
    try {
      // Récupérer les artistes de l'utilisateur
      const { data: artistsData, error: artistsError } = await supabase.rpc('get_user_artists', {
        target_user_id: userId
      });

      if (artistsError) throw artistsError;

      // Récupérer les jeux de l'utilisateur
      const { data: gamesData, error: gamesError } = await supabase.rpc('get_user_games', {
        target_user_id: userId
      });

      if (gamesError) throw gamesError;

      setUserArtists(artistsData || []);
      setUserGames(gamesData || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de cet utilisateur",
        variant: "destructive",
      });
    } finally {
      setLoadingUserData(false);
    }
  };

  return {
    searchResults,
    userArtists,
    userGames,
    loading,
    loadingUserData,
    searchUsers,
    getUserData
  };
};
