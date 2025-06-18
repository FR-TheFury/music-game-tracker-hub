
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'pending';

interface PendingValidation {
  id: string;
  user_id: string;
  user_email: string;
  username: string | null;
  status: string;
  created_at: string;
}

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingValidations, setPendingValidations] = useState<PendingValidation[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserRole = async () => {
    if (!user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      console.log('Récupération du rôle pour l\'utilisateur:', user.id);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération du rôle:', error);
        throw error;
      }
      
      console.log('Rôle utilisateur récupéré:', data.role);
      setUserRole(data.role as UserRole);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('pending'); // Fallback en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingValidations = async () => {
    if (!user || userRole !== 'admin') return;

    try {
      const { data, error } = await supabase
        .from('pending_validations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingValidations(data || []);
    } catch (error) {
      console.error('Error fetching pending validations:', error);
    }
  };

  const approveUser = async (userId: string, newRole: UserRole) => {
    if (!user || userRole !== 'admin') return;

    try {
      console.log('Approbation de l\'utilisateur:', userId, 'avec le rôle:', newRole);
      
      // Update user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ 
          role: newRole, 
          approved_by: user.id, 
          approved_at: new Date().toISOString() 
        })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Update pending validation status
      const { error: validationError } = await supabase
        .from('pending_validations')
        .update({ status: 'approved' })
        .eq('user_id', userId);

      if (validationError) throw validationError;

      // Refresh pending validations
      await fetchPendingValidations();

      // Si c'est l'utilisateur actuel qui est approuvé, rafraîchir son rôle
      if (userId === user.id) {
        console.log('Rafraîchissement du rôle de l\'utilisateur actuel');
        await fetchUserRole();
      }

      toast({
        title: "Utilisateur approuvé",
        description: `L'utilisateur a été approuvé avec le rôle ${newRole}.`,
      });
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const rejectUser = async (userId: string) => {
    if (!user || userRole !== 'admin') return;

    try {
      // Update pending validation status
      const { error } = await supabase
        .from('pending_validations')
        .update({ status: 'rejected' })
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh pending validations
      await fetchPendingValidations();

      toast({
        title: "Utilisateur rejeté",
        description: "La demande d'accès a été rejetée.",
      });
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter l'utilisateur",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchPendingValidations();
    }
  }, [userRole]);

  // Écouter les changements de rôles en temps réel
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('user-role-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Changement de rôle détecté:', payload);
          if (payload.new && payload.new.role) {
            setUserRole(payload.new.role as UserRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  return {
    userRole,
    loading,
    pendingValidations,
    approveUser,
    rejectUser,
    refetchPendingValidations: fetchPendingValidations,
    refetchUserRole: fetchUserRole,
  };
};
