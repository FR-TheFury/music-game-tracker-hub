
import React from 'react';
import { GameCard } from '@/components/GameCard';
import { CarouselGrid } from '@/components/CarouselGrid';

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

interface GamesGridProps {
  games: Game[];
  onDeleteGame?: (gameId: string) => Promise<void>;
}

export const GamesGrid: React.FC<GamesGridProps> = ({ games, onDeleteGame }) => {
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

  const gameCards = games.map((game) => (
    <GameCard 
      key={game.id} 
      game={game} 
      onRemove={onDeleteGame} 
    />
  ));

  return <CarouselGrid items={gameCards} />;
};
