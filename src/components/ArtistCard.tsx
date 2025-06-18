import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  // Nouvelles propriétés pour les statistiques cumulées
  totalFollowers?: number;
  averagePopularity?: number;
  platformStats?: Array<{
    platform: string;
    followers?: number;
    popularity?: number;
  }>;
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
        return 'bg-green-600';
      case 'apple music':
        return 'bg-red-500';
      case 'deezer':
        return 'bg-orange-600';
      case 'youtube':
        return 'bg-red-600';
      case 'youtube music':
        return 'bg-red-700';
      case 'amazon music':
        return 'bg-blue-600';
      case 'apple':
        return 'bg-red-500';
      case 'tidal':
        return 'bg-black';
      case 'soundcloud':
        return 'bg-orange-500';
      default:
        return 'bg-purple-500';
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

  // Calculer le nombre total de plateformes
  const getAllPlatforms = () => {
    const platforms = [];
    platforms.push({ name: artist.platform, url: artist.url });
    
    if (artist.multipleUrls) {
      artist.multipleUrls.forEach(platformUrl => {
        if (platformUrl.platform.toLowerCase() !== artist.platform.toLowerCase()) {
          platforms.push({
            name: platformUrl.platform,
            url: platformUrl.url
          });
        }
      });
    }
    
    return platforms;
  };

  const allPlatforms = getAllPlatforms();
  const totalPlatformCount = allPlatforms.length;

  // Utiliser prioritairement les statistiques cumulées si disponibles
  const getDisplayFollowers = () => {
    // Si on a des statistiques cumulées et qu'elles sont supérieures à 0
    if (artist.totalFollowers && artist.totalFollowers > 0) {
      console.log(`Affichage followers cumulés pour ${artist.name}:`, artist.totalFollowers);
      return artist.totalFollowers;
    }
    
    // Sinon utiliser les followers de la plateforme principale
    const mainFollowers = artist.followersCount || 0;
    console.log(`Affichage followers principaux pour ${artist.name}:`, mainFollowers);
    return mainFollowers;
  };

  const getDisplayPopularity = () => {
    // Si on a une popularité moyenne calculée
    if (artist.averagePopularity && artist.averagePopularity > 0) {
      return artist.averagePopularity;
    }
    
    // Sinon utiliser la popularité de la plateforme principale
    return artist.popularity || 0;
  };

  const displayFollowers = getDisplayFollowers();
  const displayPopularity = getDisplayPopularity();

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
                <div className={`w-12 h-12 rounded-full ${getPlatformColor(artist.platform)} flex items-center justify-center`}>
                  <Music className="h-6 w-6 text-white" />
                </div>
              )}
              
              {/* Indicateur multi-plateformes simplifié */}
              {totalPlatformCount > 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {totalPlatformCount}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Disponible sur {totalPlatformCount} plateformes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                {artist.name}
              </h3>
              <p className="text-sm text-gray-400">
                {totalPlatformCount > 1 ? `${totalPlatformCount} plateformes` : artist.platform}
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

        {/* Statistiques avec indicateur de cumul */}
        <div className="mb-4">
          <div className="flex gap-4 text-sm">
            {displayFollowers > 0 && (
              <div className="flex items-center gap-1 text-gray-300">
                <Users className="h-3 w-3 text-purple-400" />
                <span className="font-medium text-purple-300">
                  {formatFollowersCount(displayFollowers)}
                </span>
                <span className="text-xs text-gray-500">
                  {artist.totalFollowers && artist.totalFollowers > 0 ? 'followers total' : 'followers'}
                </span>
              </div>
            )}
            
            {displayPopularity > 0 && (
              <div className="flex items-center gap-1 text-gray-300">
                <Star className="h-3 w-3 text-yellow-400" />
                <span className="font-medium text-yellow-300">
                  {Math.round(displayPopularity)}%
                </span>
                <span className="text-xs text-gray-500">
                  {artist.averagePopularity && artist.averagePopularity > 0 ? 'popularité moy.' : 'popularité'}
                </span>
              </div>
            )}
          </div>
          
          {/* Indicateur de source des statistiques */}
          {totalPlatformCount > 1 && (artist.totalFollowers || artist.averagePopularity) && (
            <div className="text-xs text-purple-400 mt-1">
              Statistiques combinées de {totalPlatformCount} plateformes
            </div>
          )}
        </div>

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
          <div className="flex gap-2">
            {/* Lien vers la plateforme principale */}
            <Button
              variant="outline"
              size="sm"
              asChild
              onClick={handleLinkClick}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400"
            >
              <a href={artist.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Écouter
              </a>
            </Button>
            
            {/* Indicateur d'autres plateformes */}
            {totalPlatformCount > 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLinkClick}
                      className="border-slate-600 text-gray-300 hover:bg-slate-600"
                    >
                      +{totalPlatformCount - 1}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Autres plateformes :</p>
                      {allPlatforms.slice(1).map((platform, index) => (
                        <div key={index} className="text-xs">
                          <a 
                            href={platform.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-300 hover:text-purple-100"
                          >
                            {platform.name} →
                          </a>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
