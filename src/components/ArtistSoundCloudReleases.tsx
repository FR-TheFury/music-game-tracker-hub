
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, ExternalLink, Calendar, Play, Heart } from 'lucide-react';
import { useSoundCloud } from '@/hooks/useSoundCloud';

interface SoundCloudRelease {
  id: number;
  title: string;
  created_at: string;
  permalink_url: string;
  artwork_url: string;
  playback_count: number;
  likes_count: number;
  release_date: string;
}

interface ArtistSoundCloudReleasesProps {
  artistName: string;
  soundcloudUrl?: string;
}

export const ArtistSoundCloudReleases: React.FC<ArtistSoundCloudReleasesProps> = ({ 
  artistName, 
  soundcloudUrl 
}) => {
  const [releases, setReleases] = useState<SoundCloudRelease[]>([]);
  const { getArtistReleases, loading } = useSoundCloud();

  useEffect(() => {
    const fetchReleases = async () => {
      if (!artistName) return;

      try {
        console.log('Fetching SoundCloud releases for:', artistName, soundcloudUrl);
        const soundcloudReleases = await getArtistReleases(artistName, soundcloudUrl, 10);
        
        // Filtrer les sorties du dernier mois
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const recentReleases = soundcloudReleases.filter(release => {
          const releaseDate = new Date(release.created_at);
          return releaseDate > oneMonthAgo;
        });
        
        console.log(`Found ${recentReleases.length} recent SoundCloud releases`);
        setReleases(recentReleases);
      } catch (error) {
        console.error('Error fetching SoundCloud releases:', error);
      }
    };

    fetchReleases();
  }, [artistName, soundcloudUrl]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getArtworkUrl = (artworkUrl: string) => {
    if (!artworkUrl) return '/placeholder.svg';
    // Remplacer par une version plus grande si possible
    return artworkUrl.replace('-large', '-t500x500') || artworkUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  if (releases.length === 0) {
    return null; // Ne pas afficher la section s'il n'y a pas de sorties récentes
  }

  return (
    <Card className="card-3d mb-8">
      <CardHeader className="header-3d">
        <CardTitle className="flex items-center gap-2 text-white">
          <Music className="h-5 w-5 text-orange-400" />
          Sorties SoundCloud récentes (dernier mois)
          <Badge variant="outline" className="border-orange-400/50 text-orange-400 bg-orange-400/10">
            {releases.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map((release) => (
            <div 
              key={release.id} 
              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-orange-400/50 transition-all duration-300 hover:bg-slate-700/70"
            >
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={getArtworkUrl(release.artwork_url)}
                  alt={release.title}
                  className="w-16 h-16 rounded object-cover flex-shrink-0 border border-orange-400/20"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate" title={release.title}>
                    {release.title}
                  </h4>
                  <p className="text-sm text-gray-400">SoundCloud</p>
                  {release.created_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(release.created_at)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                {release.playback_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    <span>{formatNumber(release.playback_count)}</span>
                  </div>
                )}
                {release.likes_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{formatNumber(release.likes_count)}</span>
                  </div>
                )}
              </div>
              
              {release.permalink_url && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full border-orange-400/30 text-orange-300 hover:bg-orange-400/10 hover:border-orange-400"
                >
                  <a href={release.permalink_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Écouter sur SoundCloud
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
