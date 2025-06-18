
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Clock, Check, X, User, Settings, Key } from 'lucide-react';

export const AdminTabs: React.FC = () => {
  const { userRole, pendingValidations, approveUser, rejectUser, loading } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  if (userRole !== 'admin') {
    return null;
  }

  if (loading) {
    return <div>Chargement...</div>;
  }

  const handleApprove = (userId: string, role: UserRole) => {
    approveUser(userId, role);
  };

  const handleReject = (userId: string) => {
    rejectUser(userId);
  };

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

  return (
    <Card className="mb-6 bg-slate-800/90 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          Administration & Profil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700">
            <TabsTrigger value="users" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              Gestion des utilisateurs
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white">
              <User className="h-4 w-4" />
              Mon profil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Demandes en attente</h3>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {pendingValidations.length} en attente
                </Badge>
              </div>
              
              {pendingValidations.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune demande en attente</p>
              ) : (
                <div className="space-y-3">
                  {pendingValidations.map((validation) => (
                    <div 
                      key={validation.id} 
                      className="flex items-center justify-between p-4 bg-slate-700/50 border border-slate-600 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-orange-400" />
                        <div>
                          <p className="font-medium text-white">{validation.username || 'Sans nom'}</p>
                          <p className="text-sm text-gray-300">{validation.user_email}</p>
                          <p className="text-xs text-gray-400">
                            Demandé le {new Date(validation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(validation.user_id, 'viewer')}
                          className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Lecteur
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(validation.user_id, 'editor')}
                          className="text-green-400 border-green-400 hover:bg-green-400/10"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Éditeur
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(validation.user_id)}
                          className="text-red-400 border-red-400 hover:bg-red-400/10"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Gestion du profil</h3>
              </div>
              
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Informations du compte</h4>
                  <div className="space-y-2">
                    <p className="text-white">
                      <span className="text-gray-400">Email:</span> {user?.email}
                    </p>
                    <p className="text-white">
                      <span className="text-gray-400">Rôle:</span> 
                      <Badge variant="outline" className="ml-2 border-purple-400 text-purple-400">
                        {userRole}
                      </Badge>
                    </p>
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
