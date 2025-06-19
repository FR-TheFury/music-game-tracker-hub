
import React from 'react';
import { Artist } from '@/types/artist';
import { ArtistCard } from '@/components/ArtistCard';

interface ArtistsGridProps {
  artists: Artist[];
  onDeleteArtist?: (artistId: string) => Promise<void>;
}

export const ArtistsGrid: React.FC<ArtistsGridProps> = ({ artists, onDeleteArtist }) => {
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
        <ArtistCard 
          key={artist.id} 
          artist={artist} 
          onRemove={onDeleteArtist} 
        />
      ))}
    </div>
  );
};
