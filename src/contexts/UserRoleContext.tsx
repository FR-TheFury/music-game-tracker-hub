
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'pending';

interface UserRoleContextProps {
  userRole: UserRole | null;
  pendingValidations: { id: string; email: string }[];
  loadingRole: boolean;
  loading: boolean; // Added this property
  approveUser: (userId: string, role: UserRole) => void;
  rejectUser: (userId: string) => void;
}

const UserRoleContext = createContext<UserRoleContextProps | undefined>(undefined);

export const UserRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [pendingValidations, setPendingValidations] = useState<{ id: string; email: string }[]>([]);
  const [loadingRole, setLoadingRole] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoadingRole(false);
        return;
      }

      setLoadingRole(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole('pending');
        } else if (data) {
          setUserRole(data.role as UserRole);
        } else {
          setUserRole('pending');
        }
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, [user]);

  useEffect(() => {
    const fetchPendingValidations = async () => {
      if (!user || userRole !== 'admin') return;

      try {
        // Query the pending_validations table directly
        const { data, error } = await supabase
          .from('pending_validations')
          .select('user_id, user_email')
          .eq('status', 'pending');

        if (error) throw error;

        const validations = (data || []).map(item => ({
          id: item.user_id,
          email: item.user_email,
        }));

        setPendingValidations(validations);
      } catch (error) {
        console.error('Error fetching pending validations:', error);
      }
    };

    fetchPendingValidations();
  }, [user, userRole]);

  const approveUser = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          role, 
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Créer automatiquement les paramètres de notification par défaut
      const { error: notificationError } = await supabase
        .from('notification_settings')
        .insert({
          user_id: userId,
          email_notifications_enabled: true,
          notification_frequency: 'immediate',
          artist_notifications_enabled: true,
          game_notifications_enabled: true,
        });

      if (notificationError) {
        console.log('Notification settings may already exist for user:', userId);
        // Ne pas faire échouer l'approbation si les paramètres existent déjà
      }

      setPendingValidations(prev => prev.filter(v => v.id !== userId));
      
      // Refresh pending validations for admin
      if (userRole === 'admin') {
        const { data, error } = await supabase
          .from('pending_validations')
          .select('user_id, user_email')
          .eq('status', 'pending');

        if (error) throw error;

        const validations = (data || []).map(item => ({
          id: item.user_id,
          email: item.user_email,
        }));

        setPendingValidations(validations);
      }
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setPendingValidations(prev => prev.filter(v => v.id !== userId));
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  return (
    <UserRoleContext.Provider value={{ 
      userRole, 
      pendingValidations, 
      loadingRole, 
      loading: loadingRole, // Added this for backward compatibility
      approveUser, 
      rejectUser 
    }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRoleContext = () => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRoleContext must be used within a UserRoleProvider');
  }
  return context;
};

// Export useUserRole for backward compatibility
export const useUserRole = () => {
  return useUserRoleContext();
};
