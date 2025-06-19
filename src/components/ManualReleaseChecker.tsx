
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ManualReleaseChecker: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const { toast } = useToast();

  const triggerCheck = async () => {
    setLoading(true);
    try {
      console.log('Triggering manual release check...');
      
      const { data, error } = await supabase.functions.invoke('trigger-releases-check');

      if (error) {
        throw error;
      }

      console.log('Release check result:', data);
      
      setLastCheck(new Date().toLocaleString('fr-FR'));
      
      toast({
        title: "Vérification terminée",
        description: `${data?.result?.newReleasesFound || 0} nouvelles sorties détectées`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Error triggering release check:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déclencher la vérification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-800/90 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="h-5 w-5 text-yellow-400" />
          Vérification Manuelle des Sorties
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-300">
          <p>Déclenchez manuellement la vérification des nouvelles sorties pour vos artistes et jeux suivis.</p>
          <p className="mt-2">Cette fonction vérifie :</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Les nouveaux albums/singles sur Spotify</li>
            <li>Les mises à jour de jeux</li>
            <li>Envoie des notifications par email si configuré</li>
          </ul>
        </div>

        {lastCheck && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>Dernière vérification : {lastCheck}</span>
          </div>
        )}

        <Button
          onClick={triggerCheck}
          disabled={loading}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Vérifier les Nouvelles Sorties
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>La vérification peut prendre quelques secondes</span>
          </div>
          <div>
            <span>Les notifications expirent automatiquement après 7 jours</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
