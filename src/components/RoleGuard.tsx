
import React from 'react';
import { useUserRoleContext, UserRole } from '@/contexts/UserRoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
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
  const { userRole, loading } = useUserRoleContext();

  // Pendant le chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Utilisateur en attente de validation
  if (!userRole || userRole === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
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

  // Accès refusé
  if (!allowedRoles.includes(userRole)) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
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
            <p className="text-gray-400 text-sm mt-2">
              Rôle actuel: {userRole}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accès autorisé
  return <>{children}</>;
};
