
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface Artist {
  id: string;
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  lastRelease?: string;
  addedAt: string;
}

export const useArtists = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchArtists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedArtists = data.map(artist => ({
        id: artist.id,
        name: artist.name,
        platform: artist.platform,
        url: artist.url,
        imageUrl: artist.image_url,
        lastRelease: artist.last_release,
        addedAt: artist.created_at,
      }));

      setArtists(formattedArtists);
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les artistes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, [user]);

  const addArtist = async (artistData: Omit<Artist, 'id' | 'addedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('artists')
        .insert([
          {
            user_id: user.id,
            name: artistData.name,
            platform: artistData.platform,
            url: artistData.url,
            image_url: artistData.imageUrl,
            last_release: artistData.lastRelease,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newArtist: Artist = {
        id: data.id,
        name: data.name,
        platform: data.platform,
        url: data.url,
        imageUrl: data.image_url,
        lastRelease: data.last_release,
        addedAt: data.created_at,
      };

      setArtists(prev => [newArtist, ...prev]);
      
      toast({
        title: "Artiste ajouté !",
        description: `${artistData.name} a été ajouté à votre dashboard.`,
      });
    } catch (error) {
      console.error('Error adding artist:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'artiste",
        variant: "destructive",
      });
    }
  };

  const removeArtist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setArtists(prev => prev.filter(artist => artist.id !== id));
      
      toast({
        title: "Artiste supprimé",
        description: "L'artiste a été retiré de votre dashboard.",
      });
    } catch (error) {
      console.error('Error removing artist:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'artiste",
        variant: "destructive",
      });
    }
  };

  return {
    artists,
    loading,
    addArtist,
    removeArtist,
  };
};
