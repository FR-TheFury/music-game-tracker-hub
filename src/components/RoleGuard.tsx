
import React from 'react';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles = ['admin', 'editor', 'viewer'], 
  fallback 
}) => {
  const { userRole, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!userRole || userRole === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Clock className="h-12 w-12 text-orange-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Compte en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">
              Votre compte est en cours de validation par un administrateur.
            </p>
            <p className="text-gray-400 text-sm">
              Vous recevrez un email une fois votre compte approuvé.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowedRoles.includes(userRole)) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Accès refusé
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
