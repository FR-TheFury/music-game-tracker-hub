
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { Shield, Clock, Check, X } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { userRole, pendingValidations, approveUser, rejectUser, loading } = useUserRole();

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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Panel d'Administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingValidations.length === 0 ? (
          <p className="text-gray-500">Aucune demande en attente</p>
        ) : (
          <div className="space-y-4">
            {pendingValidations.map((validation) => (
              <div 
                key={validation.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="font-medium">{validation.username || 'Sans nom'}</p>
                    <p className="text-sm text-gray-500">{validation.user_email}</p>
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
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Lecteur
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(validation.user_id, 'editor')}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Éditeur
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(validation.user_id)}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
