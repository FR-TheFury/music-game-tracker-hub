
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Send notification email for new user registration
        if (event === 'SIGNED_UP' && session?.user) {
          setTimeout(async () => {
            try {
              // Get admin email (first user)
              const { data: adminData } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'admin')
                .limit(1)
                .single();

              if (adminData) {
                const { data: adminProfile } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('id', adminData.user_id)
                  .single();

                if (adminProfile) {
                  // Call edge function to send notification
                  await supabase.functions.invoke('send-admin-notification', {
                    body: {
                      userEmail: session.user.email,
                      username: session.user.user_metadata?.username || '',
                      adminEmail: 'admin@yourdomain.com' // You'll need to replace this with actual admin email
                    }
                  });
                }
              }
            } catch (error) {
              console.error('Error sending admin notification:', error);
            }
          }, 1000);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
};
