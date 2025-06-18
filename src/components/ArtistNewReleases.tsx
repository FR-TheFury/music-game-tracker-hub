
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, ExternalLink, Calendar, Clock, Sparkles } from 'lucide-react';
import { useArtistReleases } from '@/hooks/useArtistReleases';

interface ArtistNewReleasesProps {
  artistId: string;
  artistPlatforms?: Array<{ platform: string; url: string }>;
}

export const ArtistNewReleases: React.FC<ArtistNewReleasesProps> = ({ 
  artistId, 
  artistPlatforms = [] 
}) => {
  const { artistReleases, loading, filterByPlatforms } = useArtistReleases(artistId);
  
  const filteredReleases = filterByPlatforms(artistPlatforms);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const releaseDate = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - releaseDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Il y a 1 jour';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    return formatDate(dateString);
  };

  const getPlatformInfo = (url?: string) => {
    if (!url) return { name: 'Plateforme', color: 'bg-gray-500' };
    
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('spotify')) return { name: 'Spotify', color: 'bg-green-500' };
    if (lowerUrl.includes('soundcloud')) return { name: 'SoundCloud', color: 'bg-orange-500' };
    if (lowerUrl.includes('youtube')) return { name: 'YouTube', color: 'bg-red-500' };
    if (lowerUrl.includes('apple')) return { name: 'Apple Music', color: 'bg-gray-800' };
    if (lowerUrl.includes('deezer')) return { name: 'Deezer', color: 'bg-purple-500' };
    
    return { name: 'Autre', color: 'bg-blue-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (filteredReleases.length === 0) {
    return null; // Ne pas afficher la section s'il n'y a pas de nouvelles sorties
  }

  return (
    <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          Nouvelles Sorties (dernier mois)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReleases.map((release) => {
            const platformInfo = getPlatformInfo(release.platformUrl);
            
            return (
              <div key={release.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:bg-slate-700/70 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Music className="h-4 w-4 text-white" />
                    </div>
                    <Badge className={`${platformInfo.color} text-white border-0 text-xs`}>
                      {platformInfo.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Sparkles className="h-3 w-3" />
                    <span>NOUVEAU</span>
                  </div>
                </div>

                <h4 className="font-medium text-white mb-2 line-clamp-2">{release.title}</h4>
                
                {release.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{release.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{getTimeAgo(release.detectedAt)}</span>
                  </div>
                </div>

                {release.platformUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400"
                  >
                    <a href={release.platformUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Écouter sur {platformInfo.name}
                    </a>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
