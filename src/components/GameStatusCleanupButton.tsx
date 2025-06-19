
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';
import { useGameStatusCleaner } from '@/hooks/useGameStatusCleaner';

export const GameStatusCleanupButton: React.FC = () => {
  const { cleanFalseNotifications, isLoading } = useGameStatusCleaner();

  return (
    <Button
      onClick={cleanFalseNotifications}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Nettoyage...' : 'Nettoyer les fausses notifications'}
    </Button>
  );
};
