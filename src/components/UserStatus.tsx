
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { Shield, Eye, Edit, Clock } from 'lucide-react';

export const UserStatus: React.FC = () => {
  const { userRole, loading } = useUserRole();

  if (loading || !userRole) {
    return null;
  }

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrateur',
          icon: Shield,
          variant: 'default' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'editor':
        return {
          label: 'Éditeur',
          icon: Edit,
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'viewer':
        return {
          label: 'Lecteur',
          icon: Eye,
          variant: 'outline' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'pending':
        return {
          label: 'En attente',
          icon: Clock,
          variant: 'destructive' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      default:
        return {
          label: 'Inconnu',
          icon: Clock,
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const roleConfig = getRoleConfig(userRole);
  const Icon = roleConfig.icon;

  return (
    <Badge variant={roleConfig.variant} className={roleConfig.className}>
      <Icon className="h-3 w-3 mr-1" />
      {roleConfig.label}
    </Badge>
  );
};
