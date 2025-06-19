
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Bell, Settings, RefreshCw } from 'lucide-react';
import { PendingValidationsTab } from '@/components/admin/PendingValidationsTab';
import { UsersManagementTab } from '@/components/admin/UsersManagementTab';
import { ManualReleaseChecker } from '@/components/ManualReleaseChecker';
import { GameStatusCleanupButton } from '@/components/GameStatusCleanupButton';
import { useUserRoleContext } from '@/contexts/UserRoleContext';
import { useAuth } from '@/hooks/useAuth';
import { useAdminUsers } from '@/hooks/useAdminUsers';

export const AdminTabs: React.FC = () => {
  const { userRole, pendingValidations, approveUser, rejectUser } = useUserRoleContext();
  const { user } = useAuth();
  const { allUsers, loadingUsers, fetchAllUsers, updateUserRole } = useAdminUsers(userRole);

  const handleApprove = (userId: string, role: 'admin' | 'editor' | 'viewer') => {
    approveUser(userId, role);
  };

  const handleReject = (userId: string) => {
    rejectUser(userId);
  };

  return (
    <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          Administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="releases" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Sorties
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-6">
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Gestion des sorties</h3>
                <GameStatusCleanupButton />
              </div>
              <ManualReleaseChecker />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
