
import React from 'react';
import { useArtists } from '@/hooks/useArtists';
import { ArtistCard } from '@/components/ArtistCard';

export const ArtistsGrid: React.FC = () => {
  const { artists, loading, removeArtist } = useArtists();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Aucun artiste ajouté pour le moment.</p>
        <p className="text-gray-500 text-sm mt-2">
          Commencez par ajouter vos artistes préférés !
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} onRemove={removeArtist} />
      ))}
    </div>
  );
};
