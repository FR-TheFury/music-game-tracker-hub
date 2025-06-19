
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
  profile_image_url?: string;
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
      // Première requête : chercher les profils qui correspondent au terme de recherche
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchTerm}%`)
        .limit(20);

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setSearchResults([]);
        return;
      }

      // Extraire les user_ids des profils trouvés
      const userIds = profilesData.map(profile => profile.id);

      // Deuxième requête : récupérer les rôles pour ces utilisateurs
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .in('user_id', userIds)
        .in('role', ['admin', 'editor', 'viewer'])
        .not('approved_at', 'is', null);

      if (userRolesError) throw userRolesError;

      // Combiner les données
      const formattedResults = profilesData
        .map(profile => {
          const userRole = userRolesData?.find(ur => ur.user_id === profile.id);
          if (!userRole) return null; // Exclure les utilisateurs sans rôle approuvé
          
          return {
            user_id: profile.id,
            username: profile.username || 'Utilisateur',
            role: userRole.role,
            created_at: userRole.created_at,
            avatar_url: profile.avatar_url
          };
        })
        .filter(Boolean) as UserSearchResult[];

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
      // Récupérer les artistes de l'utilisateur directement
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('id, name, platform, url, image_url, profile_image_url, spotify_id, followers_count, popularity, created_at')
        .eq('user_id', userId);

      if (artistsError) throw artistsError;

      console.log('Raw artists data from DB:', artistsData);

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
