
import React from 'react';
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

  return (
    <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300 group hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/20 relative overflow-hidden">
      {/* Nouveau badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 animate-pulse">
          <Sparkles className="h-3 w-3 mr-1" />
          NOUVEAU
        </Badge>
      </div>

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getTypeColor()} flex items-center justify-center`}>
              {getTypeIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-yellow-300 transition-colors line-clamp-2">
                {release.title}
              </h3>
              <p className="text-sm text-gray-400 capitalize">
                {release.type === 'artist' ? 'Nouvel album/single' : 'Nouveau jeu'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeRelease(release.id)}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {release.description && (
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-sm text-gray-300 line-clamp-3">{release.description}</p>
          </div>
        )}

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

        <div className="flex items-center justify-between">
          {release.platformUrl ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400"
            >
              <a href={release.platformUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir
              </a>
            </Button>
          ) : (
            <div></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
