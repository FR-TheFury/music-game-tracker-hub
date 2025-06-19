
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useCleanupTrigger = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const triggerCleanup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-cleanup');
      
      if (error) throw error;
      
      console.log('Cleanup triggered:', data);
      toast({
        title: "Nettoyage déclenché",
        description: "Le nettoyage des notifications expirées a été lancé.",
      });
      
      return data;
    } catch (error) {
      console.error('Error triggering cleanup:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déclencher le nettoyage automatique.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    triggerCleanup,
    isLoading,
  };
};
