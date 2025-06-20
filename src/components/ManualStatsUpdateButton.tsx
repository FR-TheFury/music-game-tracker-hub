
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useArtistStatsUpdate } from '@/hooks/useArtistStatsUpdate';

export const ManualStatsUpdateButton: React.FC = () => {
  const { updateAllArtistStats, updating } = useArtistStatsUpdate();

  const handleUpdateStats = async () => {
    try {
      await updateAllArtistStats();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
  };

  return (
    <Button
      onClick={handleUpdateStats}
      disabled={updating}
      variant="outline"
      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400"
    >
      {updating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Mise à jour en cours...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Mettre à jour les stats
        </>
      )}
    </Button>
  );
};
