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
  const [suggestedUsers, setSuggestedUsers] = useState<UserSearchResult[]>([]);
  const [userArtists, setUserArtists] = useState<UserArtist[]>([]);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const { toast } = useToast();

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      console.log('Searching for term:', searchTerm);
      
      // Recherche flexible dans les profils - TOUS les utilisateurs peuvent chercher
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .or(`username.ilike.%${searchTerm}%,id.eq.${searchTerm}`)
        .limit(20);

      console.log('Profiles search result:', profilesData, 'Error:', profilesError);

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setSearchResults([]);
        toast({
          title: "Aucun résultat",
          description: `Aucun utilisateur trouvé pour "${searchTerm}".`,
        });
        return;
      }

      // Récupérer les rôles pour ces utilisateurs - TOUS les rôles
      const userIds = profilesData.map(profile => profile.id);
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .in('user_id', userIds);

      console.log('User roles result:', userRolesData, 'Error:', userRolesError);

      if (userRolesError) throw userRolesError;

      // Combiner les données - INCLURE TOUS les utilisateurs
      const formattedResults = profilesData
        .map(profile => {
          const userRole = userRolesData?.find(ur => ur.user_id === profile.id);
          
          return {
            user_id: profile.id,
            username: profile.username || 'Utilisateur',
            role: userRole?.role || 'non-assigné',
            created_at: userRole?.created_at || profile.created_at || new Date().toISOString(),
            avatar_url: profile.avatar_url
          };
        }) as UserSearchResult[];

      console.log('Final formatted results:', formattedResults);
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

  const loadSuggestedUsers = async () => {
    setLoadingSuggestions(true);
    try {
      // Récupérer TOUS les utilisateurs récents comme suggestions
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(12);

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setSuggestedUsers([]);
        return;
      }

      // Récupérer les rôles correspondants
      const userIds = profilesData.map(p => p.id);
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .in('user_id', userIds);

      if (userRolesError) throw userRolesError;

      // Combiner les données
      const suggestions = profilesData
        .map(profile => {
          const userRole = userRolesData?.find(ur => ur.user_id === profile.id);
          
          return {
            user_id: profile.id,
            username: profile.username || 'Utilisateur',
            role: userRole?.role || 'non-assigné',
            created_at: userRole?.created_at || profile.created_at || new Date().toISOString(),
            avatar_url: profile.avatar_url
          };
        })
        .filter(Boolean) as UserSearchResult[];

      setSuggestedUsers(suggestions);
    } catch (error) {
      console.error('Error loading suggested users:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getUserData = async (userId: string) => {
    setLoadingUserData(true);
    try {
      // Récupérer les artistes de l'utilisateur - accessible à tous
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('id, name, platform, url, image_url, profile_image_url, spotify_id, followers_count, popularity, created_at')
        .eq('user_id', userId);

      if (artistsError) throw artistsError;

      // Récupérer les jeux de l'utilisateur - accessible à tous
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('id, name, platform, url, image_url, price, discount, release_date, created_at')
        .eq('user_id', userId);

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
    suggestedUsers,
    userArtists,
    userGames,
    loading,
    loadingUserData,
    loadingSuggestions,
    searchUsers,
    loadSuggestedUsers,
    getUserData,
  };
};
