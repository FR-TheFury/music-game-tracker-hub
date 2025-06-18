
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
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role as UserRole);
    } catch (error) {
      console.error('Error fetching user role:', error);
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

  return {
    userRole,
    loading,
    pendingValidations,
    approveUser,
    rejectUser,
    refetchPendingValidations: fetchPendingValidations,
  };
};
