
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Settings, Key, RefreshCw } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { userRole, refreshUserRole } = useUserRole();
  const { toast } = useToast();
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    setResetPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "Un email de réinitialisation de mot de passe a été envoyé à votre adresse.",
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email de réinitialisation",
        variant: "destructive",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleRefreshRole = async () => {
    setRefreshing(true);
    await refreshUserRole();
    setRefreshing(false);
    toast({
      title: "Rôle actualisé",
      description: "Votre rôle a été mis à jour.",
    });
  };

  return (
    <Card className="bg-slate-800/90 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="h-5 w-5" />
          Mon Profil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Informations du compte</h4>
            <div className="space-y-2">
              <p className="text-white">
                <span className="text-gray-400">Email:</span> {user?.email}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Rôle:</span>
                <Badge variant="outline" className="border-purple-400 text-purple-400">
                  {userRole}
                </Badge>
                <Button
                  onClick={handleRefreshRole}
                  disabled={refreshing}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-600 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Sécurité</h4>
            <Button
              onClick={handlePasswordReset}
              disabled={resetPasswordLoading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Key className="h-4 w-4" />
              {resetPasswordLoading ? 'Envoi en cours...' : 'Réinitialiser le mot de passe'}
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              Un email de réinitialisation sera envoyé à votre adresse
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
