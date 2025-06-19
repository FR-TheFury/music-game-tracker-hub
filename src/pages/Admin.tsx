
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRoleContext } from '@/contexts/UserRoleContext';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Settings, Clock, Users, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PendingValidationsTab } from '@/components/admin/PendingValidationsTab';
import { UsersManagementTab } from '@/components/admin/UsersManagementTab';
import { ManualReleaseChecker } from '@/components/ManualReleaseChecker';
import { useAdminUsers } from '@/hooks/useAdminUsers';

const Admin = () => {
  const { userRole, pendingValidations, approveUser, rejectUser, loading } = useUserRoleContext();
  const { user } = useAuth();
  const { allUsers, loadingUsers, fetchAllUsers, updateUserRole } = useAdminUsers(userRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900">
        <LoadingSpinner size="lg" />
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
        <AdminHeader user={user} />

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
                <TabsList className="grid w-full grid-cols-3 bg-slate-700/50 border border-[#FF0751]/30">
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
                  <TabsTrigger 
                    value="releases" 
                    className="flex items-center gap-2 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-[#FF0751]/20 data-[state=active]:shadow-lg transition-all duration-300"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Vérification des sorties
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-6">
                  <PendingValidationsTab
                    pendingValidations={pendingValidations}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                  <UsersManagementTab
                    allUsers={allUsers}
                    loadingUsers={loadingUsers}
                    currentUserId={user?.id}
                    onRefresh={fetchAllUsers}
                    onUpdateRole={updateUserRole}
                  />
                </TabsContent>

                <TabsContent value="releases" className="mt-6">
                  <ManualReleaseChecker />
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
