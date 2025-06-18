
import React, { useState, useEffect } from 'react';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  console.log('RoleGuard - Rôle utilisateur:', userRole, 'Chargement:', loading, 'Rôles autorisés:', allowedRoles);

  // Gérer la phase d'initialisation
  useEffect(() => {
    if (!loading && userRole !== null) {
      // Attendre un petit délai pour s'assurer que tout est chargé proprement
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loading, userRole]);

  // Pendant le chargement initial ou si le rôle n'est pas encore déterminé
  if (loading || isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-3d-main">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#FF0751] rose-glow"></div>
      </div>
    );
  }

  // Utilisateur en attente de validation
  if (!userRole || userRole === 'pending') {
    console.log('RoleGuard - Utilisateur en attente ou sans rôle');
    return (
      <div className="min-h-screen bg-3d-main flex items-center justify-center px-4">
        <Card className="w-full max-w-md card-3d">
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
    console.log('RoleGuard - Accès refusé pour le rôle:', userRole);
    return fallback || (
      <div className="min-h-screen bg-3d-main flex items-center justify-center px-4">
        <Card className="w-full max-w-md card-3d">
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
  console.log('RoleGuard - Accès autorisé pour le rôle:', userRole);
  return <>{children}</>;
};
