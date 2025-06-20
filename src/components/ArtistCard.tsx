import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2, Music, Calendar, Users, Eye, Play, Loader2, RefreshCw } from 'lucide-react';
import { useSoundCloudEnrichment } from '@/hooks/useSoundCloudEnrichment';
import { useArtistStatsUpdate } from '@/hooks/useArtistStatsUpdate';

interface Artist {
  id: string;
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  lastRelease?: string;
  addedAt: string;
  bio?: string;
  genres?: string[];
  multipleUrls?: Array<{ platform: string; url: string }>;
  profileImageUrl?: string;
  followersCount?: number;
  soundcloudStats?: {
    totalPlays: number;
    totalLikes: number;
    trackCount: number;
    lastUpdated: string;
  };
}

interface ArtistCardProps {
  artist: Artist;
  onRemove: (id: string) => void;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onRemove }) => {
  const navigate = useNavigate();
  const [localArtist, setLocalArtist] = useState(artist);
  const [showSoundCloudStats, setShowSoundCloudStats] = useState(false);
  
  const { enrichArtistWithSoundCloud, isEnriching } = useSoundCloudEnrichment();
  const { updateSingleArtistStats, updating: updatingStats } = useArtistStatsUpdate();

  // Mettre à jour l'artiste local quand les props changent
  useEffect(() => {
    setLocalArtist(artist);
  }, [artist]);

  // Vérifier si l'artiste a SoundCloud
  const hasSoundCloud = localArtist.multipleUrls?.some(url => 
    url.platform?.toLowerCase().includes('soundcloud')
  ) || localArtist.platform?.toLowerCase().includes('soundcloud');

  const handleLoadSoundCloudStats = async () => {
    if (!hasSoundCloud || localArtist.soundcloudStats) return;
    
    setShowSoundCloudStats(true);
    try {
      const enrichedArtist = await enrichArtistWithSoundCloud(localArtist);
      setLocalArtist(enrichedArtist);
    } catch (error) {
      console.error('Erreur lors du chargement des stats SoundCloud:', error);
    }
  };

  const handleUpdateStats = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateSingleArtistStats(localArtist.id);
      // La mise à jour sera reflétée lors du prochain rechargement de la page
      // ou via une invalidation de query
    } catch (error) {
      console.error('Erreur lors de la mise à jour des stats:', error);
    }
  };

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

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getDisplayImage = () => {
    return localArtist.profileImageUrl || localArtist.imageUrl || '/placeholder.svg';
  };

  const getAllPlatforms = () => {
    const platforms = [];
    platforms.push({ name: localArtist.platform, url: localArtist.url });
    
    if (localArtist.multipleUrls) {
      localArtist.multipleUrls.forEach(platformUrl => {
        if (platformUrl.platform.toLowerCase() !== localArtist.platform.toLowerCase()) {
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

  const handleDetailsClick = () => {
    navigate(`/artist/${localArtist.id}`);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(localArtist.id);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300 group hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 h-80 flex flex-col">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              {localArtist.profileImageUrl ? (
                <img
                  src={getDisplayImage()}
                  alt={localArtist.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full ${getPlatformColor(localArtist.platform)} flex items-center justify-center`}>
                  <Music className="h-6 w-6 text-white" />
                </div>
              )}
              
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
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                {localArtist.name}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400 truncate">
                  {totalPlatformCount > 1 ? `${totalPlatformCount} plateformes` : localArtist.platform}
                </p>
                {localArtist.followersCount && (
                  <>
                    <span className="text-gray-600">•</span>
                    <div className="flex items-center gap-1 text-sm text-blue-400">
                      <Users className="h-3 w-3" />
                      <span>{formatFollowers(localArtist.followersCount)}</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Affichage des stats SoundCloud avec chargement à la demande */}
              {hasSoundCloud && (
                <div className="flex items-center gap-1 text-sm text-orange-400 mt-1">
                  {localArtist.soundcloudStats ? (
                    <>
                      <Play className="h-3 w-3" />
                      <span>{formatFollowers(localArtist.soundcloudStats.totalPlays)} écoutes SC</span>
                    </>
                  ) : showSoundCloudStats ? (
                    isEnriching(localArtist.id) ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Chargement SC...</span>
                      </>
                    ) : (
                      <button
                        onClick={handleLoadSoundCloudStats}
                        className="text-orange-400 hover:text-orange-300 text-xs underline"
                      >
                        Charger stats SoundCloud
                      </button>
                    )
                  ) : (
                    <button
                      onClick={handleLoadSoundCloudStats}
                      className="text-orange-400 hover:text-orange-300 text-xs underline"
                    >
                      Voir stats SoundCloud
                    </button>
                  )}
                </div>
              )}
              
              {localArtist.genres && localArtist.genres.length > 0 && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {localArtist.genres.slice(0, 2).join(', ')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Bouton de mise à jour des statistiques */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUpdateStats}
                    disabled={updatingStats}
                    className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                  >
                    {updatingStats ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mettre à jour les statistiques</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveClick}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {localArtist.lastRelease && (
              <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Dernière sortie</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">{localArtist.lastRelease}</p>
              </div>
            )}

            {localArtist.bio && (
              <div>
                <p className="text-sm text-gray-400 line-clamp-2">{localArtist.bio}</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-500">
                Ajouté le {formatDate(localArtist.addedAt)}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDetailsClick}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Détails
              </Button>
              
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
        </div>
      </CardContent>
    </Card>
  );
};
