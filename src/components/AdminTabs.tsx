
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserRole } from '@/hooks/useUserRole';
import { Shield, AlertCircle } from 'lucide-react';

export const AdminTabs: React.FC = () => {
  const { userRole } = useUserRole();

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <Card className="mb-6 bg-slate-800/90 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          Administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-white font-medium">Administration déplacée</p>
            <p className="text-gray-300 text-sm">
              Utilisez le bouton "Administration" dans la barre de navigation pour accéder au panneau d'administration complet.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
