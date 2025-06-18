
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, Music, Calendar, Users, Star } from 'lucide-react';

interface Artist {
  id: string;
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  lastRelease?: string;
  addedAt: string;
  spotifyId?: string;
  bio?: string;
  genres?: string[];
  popularity?: number;
  followersCount?: number;
  multipleUrls?: Array<{ platform: string; url: string }>;
  profileImageUrl?: string;
}

interface ArtistCardProps {
  artist: Artist;
  onRemove: (id: string) => void;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onRemove }) => {
  const navigate = useNavigate();

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'spotify':
        return 'from-green-500 to-green-600';
      case 'apple music':
        return 'from-red-500 to-pink-600';
      case 'deezer':
        return 'from-orange-500 to-red-500';
      case 'youtube music':
        return 'from-red-600 to-red-700';
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDisplayImage = () => {
    return artist.profileImageUrl || artist.imageUrl || '/placeholder.svg';
  };

  const formatFollowersCount = (count?: number) => {
    if (!count || count === 0) return null;
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${Math.floor(count / 1000)}k`;
    }
    return count.toString();
  };

  const handleCardClick = () => {
    navigate(`/artist/${artist.id}`);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(artist.id);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      className="bg-slate-800/70 border-slate-700 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300 group hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {artist.profileImageUrl ? (
                <img
                  src={getDisplayImage()}
                  alt={artist.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getPlatformColor(artist.platform)} flex items-center justify-center`}>
                  <Music className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                {artist.name}
              </h3>
              <p className="text-sm text-gray-400">
                {artist.platform}
              </p>
              {artist.genres && artist.genres.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {artist.genres.slice(0, 2).join(', ')}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveClick}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Statistiques Spotify */}
        {(artist.followersCount || artist.popularity) && (
          <div className="mb-4 flex gap-4 text-sm text-gray-400">
            {artist.followersCount && artist.followersCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{formatFollowersCount(artist.followersCount)}</span>
              </div>
            )}
            {artist.popularity && artist.popularity > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{artist.popularity}%</span>
              </div>
            )}
          </div>
        )}

        {artist.lastRelease && (
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Dernière sortie</span>
            </div>
            <p className="text-sm text-gray-300">{artist.lastRelease}</p>
          </div>
        )}

        {artist.bio && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 line-clamp-2">{artist.bio}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Ajouté le {formatDate(artist.addedAt)}
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            onClick={handleLinkClick}
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400"
          >
            <a href={artist.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
