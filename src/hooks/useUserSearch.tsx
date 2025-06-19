
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserSearchResult {
  user_id: string;
  username: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

export interface UserArtist {
  id: string;
  name: string;
  platform: string;
  url: string;
  image_url?: string;
  spotify_id?: string;
  followers_count?: number;
  popularity?: number;
  created_at: string;
}

export interface UserGame {
  id: string;
  name: string;
  platform: string;
  url: string;
  image_url?: string;
  price?: string;
  discount?: string;
  release_date?: string;
  created_at: string;
}

export const useUserSearch = () => {
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [userArtists, setUserArtists] = useState<UserArtist[]>([]);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const { toast } = useToast();

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Rechercher les utilisateurs avec leurs photos de profil
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at,
          profiles!inner(username, avatar_url)
        `)
        .eq('role', 'viewer')
        .or('role.eq.editor,role.eq.admin')
        .not('approved_at', 'is', null)
        .ilike('profiles.username', `%${searchTerm}%`)
        .limit(20);

      if (error) throw error;

      const formattedResults = data?.map(item => ({
        user_id: item.user_id,
        username: item.profiles?.username || 'Utilisateur',
        role: item.role,
        created_at: item.created_at,
        avatar_url: item.profiles?.avatar_url
      })) || [];

      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching users:', error);
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
      const { data: artistsData, error: artistsError } = await supabase
        .rpc('get_user_artists', { target_user_id: userId });

      if (artistsError) throw artistsError;

      // Récupérer les jeux de l'utilisateur
      const { data: gamesData, error: gamesError } = await supabase
        .rpc('get_user_games', { target_user_id: userId });

      if (gamesError) throw gamesError;

      setUserArtists(artistsData || []);
      setUserGames(gamesData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les données de l'utilisateur",
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
    getUserData,
  };
};
