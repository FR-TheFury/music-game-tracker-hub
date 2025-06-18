
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Users, UserCheck } from 'lucide-react';
import { User } from '@/hooks/useAdminUsers';
import { UserRole } from '@/contexts/UserRoleContext';

interface UsersManagementTabProps {
  allUsers: User[];
  loadingUsers: boolean;
  currentUserId?: string;
  onRefresh: () => void;
  onUpdateRole: (userId: string, newRole: UserRole) => void;
}

export const UsersManagementTab: React.FC<UsersManagementTabProps> = ({
  allUsers,
  loadingUsers,
  currentUserId,
  onRefresh,
  onUpdateRole
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Tous les utilisateurs</h3>
        <Button
          onClick={onRefresh}
          disabled={loadingUsers}
          variant="outline"
          size="sm"
          className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10 transition-all duration-300"
        >
          {loadingUsers ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Chargement...
            </div>
          ) : (
            'Actualiser'
          )}
        </Button>
      </div>
      
      {loadingUsers ? (
        <div className="text-center py-12">
          <LoadingSpinner size="md" className="mx-auto mb-4" />
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
                  className={
                    userItem.role === 'admin' 
                      ? 'border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10 hover:bg-[#FF0751]/20' 
                      : userItem.role === 'editor' 
                      ? 'border-green-400 text-green-400 bg-green-400/10 hover:bg-green-400/20' 
                      : userItem.role === 'viewer' 
                      ? 'border-blue-400 text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' 
                      : 'border-orange-400 text-orange-400 bg-orange-400/10 hover:bg-orange-400/20'
                  }
                >
                  {userItem.role}
                </Badge>
                {userItem.id !== currentUserId && userItem.role !== 'pending' && (
                  <div className="flex gap-1">
                    {userItem.role !== 'viewer' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateRole(userItem.id, 'viewer')}
                        className="text-blue-400 border-blue-400 hover:border-blue-300 hover:bg-blue-400/10 transition-all duration-300"
                      >
                        Viewer
                      </Button>
                    )}
                    {userItem.role !== 'editor' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateRole(userItem.id, 'editor')}
                        className="text-green-400 border-green-400 hover:border-green-300 hover:bg-green-400/10 transition-all duration-300"
                      >
                        Editor
                      </Button>
                    )}
                    {userItem.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateRole(userItem.id, 'admin')}
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
  );
};
