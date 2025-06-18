
import React from 'react';
import { useGames } from '@/hooks/useGames';
import { GameCard } from '@/components/GameCard';

export const GamesGrid: React.FC = () => {
  const { games, loading, removeGame } = useGames();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Aucun jeu ajouté pour le moment.</p>
        <p className="text-gray-500 text-sm mt-2">
          Commencez par ajouter des jeux à votre liste de souhaits !
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {games.map((game) => (
        <GameCard key={game.id} game={game} onRemove={removeGame} />
      ))}
    </div>
  );
};
