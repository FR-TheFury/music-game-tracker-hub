
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/contexts/UserRoleContext';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export const useAdminUsers = (userRole: UserRole | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchAllUsers = async () => {
    if (!user || !userRole || userRole !== 'admin') return;

    setLoadingUsers(true);
    try {
      console.log('Récupération de tous les utilisateurs via la fonction SQL...');

      // Utiliser la fonction SQL mise à jour qui retourne les emails
      const { data: usersData, error } = await supabase.rpc('get_all_users_for_admin');

      if (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        throw error;
      }

      console.log('Utilisateurs récupérés:', usersData);

      // Transformer les données en utilisant les emails de la base de données
      const combinedUsers: User[] = (usersData || []).map((userData: any) => {
        return {
          id: userData.user_id,
          email: userData.user_email || 'Email non disponible',
          username: userData.username || 'Utilisateur',
          role: userData.role as UserRole,
          created_at: userData.created_at || '',
          approved_at: userData.approved_at || undefined,
          approved_by: userData.approved_by || undefined,
        };
      });

      console.log('Utilisateurs formatés:', combinedUsers);
      setAllUsers(combinedUsers);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!user || userRole !== 'admin') {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent modifier les rôles",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          role: newRole, 
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchAllUsers();
      toast({
        title: "Rôle mis à jour",
        description: `Le rôle a été modifié avec succès vers ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rôle",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAllUsers();
    }
  }, [userRole]);

  return {
    allUsers,
    loadingUsers,
    fetchAllUsers,
    updateUserRole
  };
};
