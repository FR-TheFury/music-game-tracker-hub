
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, Music, Gamepad2, Clock, Sparkles } from 'lucide-react';
import { useNewReleases } from '@/hooks/useNewReleases';

interface NewRelease {
  id: string;
  type: 'artist' | 'game';
  sourceItemId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  platformUrl?: string;
  detectedAt: string;
  expiresAt: string;
  userId: string;
}

interface NewReleaseCardProps {
  release: NewRelease;
}

export const NewReleaseCard: React.FC<NewReleaseCardProps> = ({ release }) => {
  const { removeRelease } = useNewReleases();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Removing release:', release.id);
    
    // Marquer comme en cours de suppression pour masquer immédiatement
    setIsRemoving(true);
    
    try {
      await removeRelease(release.id);
    } catch (error) {
      // En cas d'erreur, restaurer l'affichage
      setIsRemoving(false);
      console.error('Failed to remove release:', error);
    }
  };

  // Si la notification est en cours de suppression, ne pas l'afficher
  if (isRemoving) {
    return null;
  }

  const getTypeIcon = () => {
    return release.type === 'artist' ? (
      <Music className="h-6 w-6 text-white" />
    ) : (
      <Gamepad2 className="h-6 w-6 text-white" />
    );
  };

  const getTypeColor = () => {
    return release.type === 'artist' 
      ? 'from-purple-500 to-pink-500' 
      : 'from-blue-500 to-cyan-500';
  };

  const formatTimeLeft = () => {
    const now = new Date();
    const expires = new Date(release.expiresAt);
    const timeLeft = expires.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'Expiré';
    if (daysLeft === 1) return '1 jour restant';
    return `${daysLeft} jours restants`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformInfo = (url?: string) => {
    if (!url) return { name: 'Plateforme inconnue', color: 'bg-gray-500' };
    
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('spotify')) return { name: 'Spotify', color: 'bg-green-500' };
    if (lowerUrl.includes('soundcloud')) return { name: 'SoundCloud', color: 'bg-orange-500' };
    if (lowerUrl.includes('youtube')) return { name: 'YouTube', color: 'bg-red-500' };
    if (lowerUrl.includes('apple')) return { name: 'Apple Music', color: 'bg-gray-800' };
    if (lowerUrl.includes('deezer')) return { name: 'Deezer', color: 'bg-purple-500' };
    if (lowerUrl.includes('steam')) return { name: 'Steam', color: 'bg-blue-600' };
    if (lowerUrl.includes('rawg')) return { name: 'RAWG', color: 'bg-indigo-500' };
    
    return { name: 'Autre plateforme', color: 'bg-blue-500' };
  };

  const getArtistName = () => {
    // Extraire le nom de l'artiste du titre (format: "Nom de l'artiste - Titre")
    if (release.type === 'artist' && release.title.includes(' - ')) {
      return release.title.split(' - ')[0];
    }
    return null;
  };

  const getCleanTitle = () => {
    // Nettoyer le titre pour enlever le nom de l'artiste s'il est présent
    if (release.type === 'artist' && release.title.includes(' - ')) {
      return release.title.split(' - ').slice(1).join(' - ');
    }
    return release.title;
  };

  const platformInfo = getPlatformInfo(release.platformUrl);
  const artistName = getArtistName();
  const cleanTitle = getCleanTitle();

  return (
    <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300 group hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/20 relative overflow-hidden h-80 flex flex-col">
      {/* Nouveau badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 animate-pulse">
          <Sparkles className="h-3 w-3 mr-1" />
          NOUVEAU
        </Badge>
      </div>

      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getTypeColor()} flex items-center justify-center flex-shrink-0`}>
              {getTypeIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`${platformInfo.color} text-white border-0 text-xs`}>
                  {platformInfo.name}
                </Badge>
                {artistName && (
                  <Badge variant="outline" className="border-gray-500 text-gray-300 text-xs">
                    {artistName}
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-yellow-300 transition-colors line-clamp-2">
                {cleanTitle}
              </h3>
              <p className="text-sm text-gray-400 capitalize">
                {release.type === 'artist' ? 'Nouvelle sortie musicale' : 'Mise à jour de jeu'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {release.description && (
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600 flex-shrink-0">
            <p className="text-sm text-gray-300 line-clamp-3">{release.description}</p>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-green-400">
                <Clock className="h-3 w-3" />
                <span>Détecté le {formatDate(release.detectedAt)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-yellow-400 font-medium">{formatTimeLeft()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            {release.platformUrl ? (
              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border border-purple-500 shadow-lg hover:shadow-purple-500/30 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 font-medium"
              >
                <a href={release.platformUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir sur {platformInfo.name}
                </a>
              </Button>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
