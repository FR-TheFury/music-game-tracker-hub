
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddGameForm } from '@/components/AddGameForm';
import { useGames } from '@/hooks/useGames';

export const AddGameFormWrapper: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const { addGame } = useGames();

  const handleSubmit = async (gameData: any) => {
    await addGame(gameData);
    setShowForm(false);
  };

  if (showForm) {
    return (
      <AddGameForm
        onSubmit={handleSubmit}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <Button
      onClick={() => setShowForm(true)}
      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
    >
      <Plus className="h-4 w-4 mr-2" />
      Ajouter un jeu
    </Button>
  );
};
