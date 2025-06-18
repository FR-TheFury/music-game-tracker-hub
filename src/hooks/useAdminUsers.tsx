
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/contexts/UserRoleContext';

export interface User {
  id: string;
  email: string;
  username?: string;
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
    if (!user || userRole !== 'admin') return;

    setLoadingUsers(true);
    try {
      console.log('Récupération de tous les utilisateurs...');

      // Étape 1: Récupérer tous les rôles utilisateur
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at, approved_at, approved_by')
        .order('created_at', { ascending: false });

      if (rolesError) {
        console.error('Erreur lors de la récupération des rôles:', rolesError);
        throw rolesError;
      }

      console.log('Rôles utilisateurs récupérés:', userRoles);

      // Étape 2: Récupérer tous les profils
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      if (profilesError) {
        console.error('Erreur lors de la récupération des profils:', profilesError);
        throw profilesError;
      }

      console.log('Profils récupérés:', profiles);

      // Étape 3: Récupérer les métadonnées des utilisateurs depuis auth
      const { data: authResponse, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error('Erreur lors de la récupération des utilisateurs auth:', authError);
        // Continue sans les données auth si erreur (pas d'accès admin)
      }

      const authUsers = authResponse?.users || [];
      console.log('Utilisateurs auth récupérés:', authUsers);

      // Étape 4: Combiner toutes les données
      const combinedUsers: User[] = (userRoles || []).map((roleItem) => {
        // Trouver le profil correspondant
        const profile = profiles?.find(p => p.id === roleItem.user_id);
        
        // Trouver les données auth correspondantes
        const authUser = authUsers?.find(u => u.id === roleItem.user_id);
        
        // Utiliser l'email depuis auth.users, sinon générer un fallback
        const email = authUser?.email || `user-${roleItem.user_id.slice(0, 8)}@domain.local`;
        
        // Utiliser le username depuis profiles, sinon depuis auth metadata, sinon 'Utilisateur'
        const username = profile?.username || 
                        authUser?.user_metadata?.username || 
                        'Utilisateur';

        return {
          id: roleItem.user_id,
          email: email,
          username: username,
          role: roleItem.role as UserRole,
          created_at: roleItem.created_at || '',
          approved_at: roleItem.approved_at || undefined,
          approved_by: roleItem.approved_by || undefined,
        };
      });

      console.log('Utilisateurs combinés final:', combinedUsers);
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
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          role: newRole, 
          approved_by: user?.id,
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
