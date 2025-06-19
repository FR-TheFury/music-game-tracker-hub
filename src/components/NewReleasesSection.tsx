
import React from 'react';
import { useNewReleases } from '@/hooks/useNewReleases';
import { NewReleaseCard } from '@/components/NewReleaseCard';
import { CarouselGrid } from '@/components/CarouselGrid';
import { Loader2, Bell, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

export const NewReleasesSection: React.FC = () => {
  const { releases, loading, refetch } = useNewReleases();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [checking, setChecking] = React.useState(false);

  const handleManualCheck = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour vérifier les sorties",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);
    try {
      console.log('Starting manual releases check...');
      
      // Vérifier les sorties pour cet utilisateur spécifiquement
      const { data, error } = await supabase.functions.invoke('check-user-releases', {
        body: { 
          userId: user.id,
          forceCheck: true 
        }
      });
      
      if (error) {
        console.error('Manual check error:', error);
        throw error;
      }
      
      console.log('Manual check result:', data);
      
      // Vérifier aussi les jeux de l'utilisateur
      const { data: gameData, error: gameError } = await supabase.functions.invoke('check-game-updates', {
        body: { 
          userId: user.id,
          forceCheck: true 
        }
      });
      
      if (gameError) {
        console.error('Game check error:', gameError);
      }
      
      const totalNewReleases = (data?.newReleases || 0) + (gameData?.newUpdates || 0);
      
      toast({
        title: "Vérification terminée",
        description: `${totalNewReleases} nouvelles notifications détectées`,
        duration: 4000,
      });
      
      // Actualiser les données après un délai
      setTimeout(() => {
        refetch();
      }, 1500);
      
    } catch (error) {
      console.error('Error during manual check:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les nouvelles sorties",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        <span className="ml-2 text-gray-400">Chargement des notifications...</span>
      </div>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-[#FF0751]" />
          <h2 className="text-2xl font-bold text-white">Nouvelles Sorties</h2>
          <div className="flex items-center gap-1 px-2 py-1 bg-[#FF0751]/10 rounded-full border border-[#FF0751]/30">
            <Clock className="h-4 w-4 text-[#FF0751]" />
            <span className="text-xs text-[#FF0751] font-medium">Expire dans 7 jours</span>
          </div>
          
          {/* Bouton simplifié pour mobile */}
          {isMobile && (
            <Button
              onClick={handleManualCheck}
              disabled={checking}
              variant="ghost"
              size="sm"
              className="ml-auto p-1 h-8 w-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border border-purple-500 shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <RefreshCw className="h-4 w-4 text-white" />
              )}
            </Button>
          )}
        </div>
        
        {/* Bouton complet pour desktop */}
        {!isMobile && (
          <Button
            onClick={handleManualCheck}
            disabled={checking}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border border-purple-500 shadow-lg hover:shadow-purple-500/30 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 font-medium"
          >
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Vérifier mes sorties
              </>
            )}
          </Button>
        )}
      </div>
      
      {releases.length === 0 ? (
        <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-slate-700">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Aucune nouvelle sortie pour le moment.</p>
          <p className="text-gray-500 text-sm mb-4">
            Les nouvelles sorties de vos artistes et jeux suivis apparaîtront ici !
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>💡 Le système vérifie automatiquement :</p>
            <p>• Les nouveaux albums/singles sur Spotify et SoundCloud</p>
            <p>• Les mises à jour et changements de statut des jeux</p>
            <p>• Et envoie des notifications par email si configuré</p>
          </div>
          
          <Button
            onClick={handleManualCheck}
            disabled={checking}
            className="mt-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Vérifier maintenant
              </>
            )}
          </Button>
        </div>
      ) : (
        <CarouselGrid 
          items={releases.map((release) => (
            <NewReleaseCard key={release.id} release={release} />
          ))}
          hideSideArrows={isMobile}
        />
      )}
    </section>
  );
};
