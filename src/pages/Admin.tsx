import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/RoleGuard';
import { Shield, Users, Clock, Check, X, Settings, ArrowLeft, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

const Admin = () => {
  const { userRole, pendingValidations, approveUser, rejectUser, loading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchAllUsers = async () => {
    if (!user || userRole !== 'admin') return;

    setLoadingUsers(true);
    try {
      console.log('Récupération de tous les utilisateurs...');

      // Récupérer d'abord les rôles utilisateur
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at, approved_at, approved_by')
        .order('created_at', { ascending: false });

      if (rolesError) {
        console.error('Erreur lors de la récupération des rôles:', rolesError);
        throw rolesError;
      }

      console.log('Rôles utilisateurs récupérés:', userRolesData);

      // Récupérer les profils pour obtenir les usernames
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      if (profilesError) {
        console.error('Erreur lors de la récupération des profils:', profilesError);
      }

      console.log('Profils récupérés:', profilesData);

      // Créer un map des profils pour un accès rapide
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile.username])
      );

      // Pour récupérer les emails, essayer d'utiliser l'API admin si possible
      let authUsersData = null;
      try {
        // Cette requête peut échouer selon les permissions
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError) {
          authUsersData = authData.users;
          console.log('Données auth récupérées:', authUsersData?.length, 'utilisateurs');
        }
      } catch (authError) {
        console.log('Impossible de récupérer les données auth, utilisation de fallback');
      }

      // Créer un map des emails
      const emailsMap = new Map();
      if (authUsersData) {
        authUsersData.forEach(authUser => {
          emailsMap.set(authUser.id, authUser.email);
        });
      }

      // Combiner toutes les données
      const combinedUsers: User[] = (userRolesData || []).map((roleItem: any) => {
        const username = profilesMap.get(roleItem.user_id) || 'Utilisateur inconnu';
        const email = emailsMap.get(roleItem.user_id) || `user-${roleItem.user_id.slice(0, 8)}@domain.com`;
        
        console.log(`Utilisateur ${roleItem.user_id}: username = ${username}, email = ${email}`);
        
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#FF0751] rose-glow"></div>
      </div>
    );
  }

  const handleApprove = (userId: string, role: 'admin' | 'editor' | 'viewer') => {
    approveUser(userId, role);
  };

  const handleReject = (userId: string) => {
    rejectUser(userId);
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900">
        <header className="bg-gradient-to-r from-[#FF0751]/20 to-slate-800/90 backdrop-blur-sm border-b border-[#FF0751]/30 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-[#FF0751]/20 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent">
                  Administration
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-gray-300 text-sm">
                  {user?.email}
                </span>
                <Badge variant="outline" className="border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10 hover:bg-[#FF0751]/20 transition-all duration-300">
                  Administrateur
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm hover:shadow-[0_0_30px_rgba(255,7,81,0.3)] transition-all duration-500">
            <CardHeader className="bg-gradient-to-r from-[#FF0751]/10 to-transparent border-b border-[#FF0751]/20">
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                Panneau d'Administration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="requests" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 border border-[#FF0751]/30">
                  <TabsTrigger 
                    value="requests" 
                    className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-[#FF0751]/20 data-[state=active]:shadow-lg transition-all duration-300"
                  >
                    <Clock className="h-4 w-4" />
                    Demandes d'accès
                  </TabsTrigger>
                  <TabsTrigger 
                    value="users" 
                    className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-[#FF0751]/20 data-[state=active]:shadow-lg transition-all duration-300"
                  >
                    <Users className="h-4 w-4" />
                    Gestion des utilisateurs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Demandes en attente</h3>
                      <Badge variant="secondary" className="bg-[#FF6B9D]/20 text-[#FF6B9D] border-[#FF6B9D]/30">
                        {pendingValidations.length} en attente
                      </Badge>
                    </div>
                    
                    {pendingValidations.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="p-4 rounded-full bg-[#FF0751]/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Check className="h-8 w-8 text-[#FF0751]" />
                        </div>
                        <p className="text-gray-400">Aucune demande en attente</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingValidations.map((validation) => (
                          <div 
                            key={validation.id} 
                            className="flex items-center justify-between p-4 bg-slate-700/50 border border-[#FF0751]/20 rounded-lg hover:bg-slate-700/70 hover:border-[#FF0751]/40 transition-all duration-300 hover:shadow-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-orange-500/20">
                                <Clock className="h-4 w-4 text-orange-400" />
                              </div>
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
                                className="text-blue-400 border-blue-400 hover:border-blue-300 hover:bg-blue-400/10 transition-all duration-300"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Lecteur
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(validation.user_id, 'editor')}
                                className="text-green-400 border-green-400 hover:border-green-300 hover:bg-green-400/10 transition-all duration-300"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Éditeur
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(validation.user_id)}
                                className="text-red-400 border-red-400 hover:border-red-300 hover:bg-red-400/10 transition-all duration-300"
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

                <TabsContent value="users" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Tous les utilisateurs</h3>
                      <Button
                        onClick={fetchAllUsers}
                        disabled={loadingUsers}
                        variant="outline"
                        size="sm"
                        className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10 transition-all duration-300"
                      >
                        {loadingUsers ? 'Chargement...' : 'Actualiser'}
                      </Button>
                    </div>
                    
                    {loadingUsers ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF0751] mx-auto mb-4"></div>
                        <p className="text-gray-400">Chargement des utilisateurs...</p>
                      </div>
                    ) : allUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="p-4 rounded-full bg-gray-500/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Users className="h-8 w-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400">Aucun utilisateur trouvé</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allUsers.map((userItem) => (
                          <div 
                            key={userItem.id} 
                            className="flex items-center justify-between p-4 bg-slate-700/50 border border-[#FF0751]/20 rounded-lg hover:bg-slate-700/70 hover:border-[#FF0751]/40 transition-all duration-300 hover:shadow-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-green-500/20">
                                <UserCheck className="h-4 w-4 text-green-400" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{userItem.username}</p>
                                <p className="text-sm text-gray-300">{userItem.email}</p>
                                <p className="text-xs text-gray-400">
                                  Inscrit le {new Date(userItem.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant="outline" 
                                className={`transition-all duration-300 ${
                                  userItem.role === 'admin' ? 'border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10 hover:bg-[#FF0751]/20' :
                                  userItem.role === 'editor' ? 'border-green-400 text-green-400 bg-green-400/10 hover:bg-green-400/20' :
                                  userItem.role === 'viewer' ? 'border-blue-400 text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' :
                                  'border-orange-400 text-orange-400 bg-orange-400/10 hover:bg-orange-400/20'
                                }`}
                              >
                                {userItem.role}
                              </Badge>
                              {userItem.id !== user?.id && userItem.role !== 'pending' && (
                                <div className="flex gap-1">
                                  {userItem.role !== 'viewer' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(userItem.id, 'viewer')}
                                      className="text-blue-400 border-blue-400 hover:border-blue-300 hover:bg-blue-400/10 transition-all duration-300"
                                    >
                                      Viewer
                                    </Button>
                                  )}
                                  {userItem.role !== 'editor' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(userItem.id, 'editor')}
                                      className="text-green-400 border-green-400 hover:border-green-300 hover:bg-green-400/10 transition-all duration-300"
                                    >
                                      Editor
                                    </Button>
                                  )}
                                  {userItem.role !== 'admin' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(userItem.id, 'admin')}
                                      className="text-[#FF0751] border-[#FF0751] hover:border-[#FF3971] hover:bg-[#FF0751]/10 transition-all duration-300"
                                    >
                                      Admin
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
    </RoleGuard>
  );
};

export default Admin;
