
import React from 'react';
import { UserArtist } from '@/hooks/useUserSearch';
import { Badge } from '@/components/ui/badge';
import { Music, ExternalLink, Users } from 'lucide-react';

interface ReadOnlyArtistsGridProps {
  artists: UserArtist[];
}

export const ReadOnlyArtistsGrid: React.FC<ReadOnlyArtistsGridProps> = ({ artists }) => {
  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 rounded-full bg-gray-500/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Music className="h-8 w-8 text-gray-500" />
        </div>
        <p className="text-gray-400">Aucun artiste ajouté</p>
      </div>
    );
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'spotify':
        return 'from-green-600 to-green-700';
      case 'apple music':
        return 'from-red-500 to-red-600';
      case 'deezer':
        return 'from-orange-600 to-orange-700';
      case 'youtube':
        return 'from-red-600 to-red-700';
      case 'youtube music':
        return 'from-red-700 to-red-800';
      default:
        return 'from-purple-500 to-purple-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artists.map((artist) => (
        <div
          key={artist.id}
          className="bg-slate-700/50 border border-[#FF0751]/20 rounded-lg p-4 hover:bg-slate-700/70 hover:border-[#FF0751]/40 transition-all duration-300 hover:shadow-lg hover:scale-105"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {artist.image_url ? (
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  className="w-16 h-16 rounded-lg object-cover shadow-md"
                  onError={(e) => {
                    console.log('Image failed to load for artist:', artist.name, 'URL:', artist.image_url);
                  }}
                />
              ) : (
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${getPlatformColor(artist.platform)} flex items-center justify-center shadow-md`}>
                  <Music className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-lg truncate mb-1">{artist.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-purple-400 text-purple-400 bg-purple-400/10 text-xs">
                  {artist.platform}
                </Badge>
                {artist.url && (
                  <a
                    href={artist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-2 text-sm text-gray-400">
                {artist.followers_count && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{artist.followers_count.toLocaleString()}</span>
                  </div>
                )}
                {artist.popularity && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">⭐</span>
                    <span>{artist.popularity}%</span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Ajouté le {new Date(artist.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
