
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddArtistForm } from './AddArtistForm';
import { RoleGuard } from './RoleGuard';
import { useArtists } from '@/hooks/useArtists';

export const AddArtistFormWrapper: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const { addArtist } = useArtists();

  const handleSubmit = async (artistData: any) => {
    await addArtist(artistData);
    setShowForm(false);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'editor']}>
      {showForm ? (
        <AddArtistForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un artiste
        </Button>
      )}
    </RoleGuard>
  );
};
