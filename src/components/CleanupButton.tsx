
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';
import { useCleanupTrigger } from '@/hooks/useCleanupTrigger';

export const CleanupButton: React.FC = () => {
  const { triggerCleanup, isLoading } = useCleanupTrigger();

  return (
    <Button
      onClick={triggerCleanup}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-400"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Nettoyage...' : 'Nettoyer les notifications expirées'}
    </Button>
  );
};
