
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
      // Récupérer les rôles des utilisateurs avec leurs profils
      const { data: usersData, error: usersError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at,
          approved_at,
          approved_by
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Récupérer les profils séparément
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Récupérer les utilisateurs d'authentification
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Combiner toutes les données
      const combinedUsers: User[] = usersData.map(userRole => {
        const authUser = authData.users.find(au => au.id === userRole.user_id);
        const profile = profilesData?.find(p => p.id === userRole.user_id);
        
        return {
          id: userRole.user_id,
          email: authUser?.email || 'Email non trouvé',
          username: profile?.username || authUser?.user_metadata?.username || 'Sans nom',
          role: userRole.role as UserRole,
          created_at: userRole.created_at || '',
          approved_at: userRole.approved_at || undefined,
          approved_by: userRole.approved_by || undefined,
        };
      });

      setAllUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
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
        description: `Le rôle a été modifié avec succès.`,
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <header className="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border-b border-slate-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-slate-700/50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Shield className="h-8 w-8 text-[#FF0751] drop-shadow-lg" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent">
                  Administration
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-gray-300 text-sm">
                  {user?.email}
                </span>
                <Badge variant="outline" className="border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10">
                  Administrateur
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-slate-800/90 border-slate-700 shadow-2xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5" />
                Panneau d'Administration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="requests" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 border border-slate-600">
                  <TabsTrigger value="requests" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-[#FF0751]/20">
                    <Clock className="h-4 w-4" />
                    Demandes d'accès
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-[#FF0751]/20">
                    <Users className="h-4 w-4" />
                    Gestion des utilisateurs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-4">
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
                            className="flex items-center justify-between p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700/70 transition-colors"
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
                                className="text-blue-400 border-blue-400 hover:border-blue-300 hover:bg-blue-400/10"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Lecteur
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(validation.user_id, 'editor')}
                                className="text-green-400 border-green-400 hover:border-green-300 hover:bg-green-400/10"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Éditeur
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(validation.user_id)}
                                className="text-red-400 border-red-400 hover:border-red-300 hover:bg-red-400/10"
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

                <TabsContent value="users" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Tous les utilisateurs</h3>
                      <Button
                        onClick={fetchAllUsers}
                        disabled={loadingUsers}
                        variant="outline"
                        size="sm"
                        className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10"
                      >
                        {loadingUsers ? 'Chargement...' : 'Actualiser'}
                      </Button>
                    </div>
                    
                    {loadingUsers ? (
                      <p className="text-gray-400 text-center py-8">Chargement des utilisateurs...</p>
                    ) : allUsers.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">Aucun utilisateur trouvé</p>
                    ) : (
                      <div className="space-y-3">
                        {allUsers.map((userItem) => (
                          <div 
                            key={userItem.id} 
                            className="flex items-center justify-between p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700/70 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <UserCheck className="h-4 w-4 text-green-400" />
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
                                className={`${
                                  userItem.role === 'admin' ? 'border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10' :
                                  userItem.role === 'editor' ? 'border-green-400 text-green-400 bg-green-400/10' :
                                  userItem.role === 'viewer' ? 'border-blue-400 text-blue-400 bg-blue-400/10' :
                                  'border-orange-400 text-orange-400 bg-orange-400/10'
                                }`}
                              >
                                {userItem.role}
                              </Badge>
                              {userItem.id !== user?.id && (
                                <div className="flex gap-1">
                                  {userItem.role !== 'viewer' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(userItem.id, 'viewer')}
                                      className="text-blue-400 border-blue-400 hover:border-blue-300 hover:bg-blue-400/10"
                                    >
                                      Viewer
                                    </Button>
                                  )}
                                  {userItem.role !== 'editor' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(userItem.id, 'editor')}
                                      className="text-green-400 border-green-400 hover:border-green-300 hover:bg-green-400/10"
                                    >
                                      Editor
                                    </Button>
                                  )}
                                  {userItem.role !== 'admin' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateUserRole(userItem.id, 'admin')}
                                      className="text-[#FF0751] border-[#FF0751] hover:border-[#FF3971] hover:bg-[#FF0751]/10"
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
