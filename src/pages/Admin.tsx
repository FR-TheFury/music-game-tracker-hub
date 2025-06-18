
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/RoleGuard';
import { Shield, Users, Clock, Check, X, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { userRole, pendingValidations, approveUser, rejectUser, loading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
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
        <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Shield className="h-8 w-8 text-purple-400" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Administration
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-gray-300 text-sm">
                  {user?.email}
                </span>
                <Badge variant="outline" className="border-purple-400 text-purple-400">
                  Administrateur
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-slate-800/90 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5" />
                Panneau d'Administration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="requests" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger value="requests" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white">
                    <Clock className="h-4 w-4" />
                    Demandes d'accès
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white">
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

                <TabsContent value="users" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Gestion des utilisateurs</h3>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                      <p className="text-gray-300 text-center">
                        Fonctionnalité de gestion des utilisateurs en cours de développement
                      </p>
                      <p className="text-gray-400 text-center text-sm mt-2">
                        Ici vous pourrez voir tous les utilisateurs, modifier leurs rôles, et les gérer
                      </p>
                    </div>
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
