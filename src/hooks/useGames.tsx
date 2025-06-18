
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface Game {
  id: string;
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  price?: string;
  discount?: string;
  releaseDate?: string;
  addedAt: string;
}

export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchGames = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedGames = data.map(game => ({
        id: game.id,
        name: game.name,
        platform: game.platform,
        url: game.url,
        imageUrl: game.image_url,
        price: game.price,
        discount: game.discount,
        releaseDate: game.release_date,
        addedAt: game.created_at,
      }));

      setGames(formattedGames);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les jeux",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [user]);

  const addGame = async (gameData: Omit<Game, 'id' | 'addedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .insert([
          {
            user_id: user.id,
            name: gameData.name,
            platform: gameData.platform,
            url: gameData.url,
            image_url: gameData.imageUrl,
            price: gameData.price,
            discount: gameData.discount,
            release_date: gameData.releaseDate,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newGame: Game = {
        id: data.id,
        name: data.name,
        platform: data.platform,
        url: data.url,
        imageUrl: data.image_url,
        price: data.price,
        discount: data.discount,
        releaseDate: data.release_date,
        addedAt: data.created_at,
      };

      setGames(prev => [newGame, ...prev]);
      
      toast({
        title: "Jeu ajouté !",
        description: `${gameData.name} a été ajouté à votre liste de souhaits.`,
      });
    } catch (error) {
      console.error('Error adding game:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le jeu",
        variant: "destructive",
      });
    }
  };

  const removeGame = async (id: string) => {
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGames(prev => prev.filter(game => game.id !== id));
      
      toast({
        title: "Jeu supprimé",
        description: "Le jeu a été retiré de votre liste de souhaits.",
      });
    } catch (error) {
      console.error('Error removing game:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le jeu",
        variant: "destructive",
      });
    }
  };

  return {
    games,
    loading,
    addGame,
    removeGame,
  };
};
