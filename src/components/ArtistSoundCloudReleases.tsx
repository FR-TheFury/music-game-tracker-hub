
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, ExternalLink, Calendar, Play, Heart, Wifi, WifiOff, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
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
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorType, setErrorType] = useState<'none' | 'rate_limit' | 'no_soundcloud' | 'no_results' | 'api_error'>('none');
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null);
  const { getArtistReleases, loading, error } = useSoundCloud();

  const fetchReleases = useCallback(async (isRetry = false) => {
    if (!artistName) return;

    if (!soundcloudUrl) {
      console.log('No SoundCloud URL configured for', artistName);
      setHasSearched(true);
      setErrorType('no_soundcloud');
      setIsServiceAvailable(true);
      setReleases([]);
      return;
    }

    try {
      setHasSearched(false);
      setErrorType('none');
      setIsServiceAvailable(true);
      
      console.log('Fetching SoundCloud releases for:', artistName, soundcloudUrl);
      
      if (isRetry && retryCount > 0) {
        const waitTime = Math.min(retryCount * 5000, 30000);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const soundcloudReleases = await getArtistReleases(artistName, soundcloudUrl, 20);
      setHasSearched(true);
      
      console.log('SoundCloud releases received:', soundcloudReleases);
      
      if (!soundcloudReleases || soundcloudReleases.length === 0) {
        console.log('No SoundCloud releases found for', artistName);
        setIsServiceAvailable(true);
        setReleases([]);
        setErrorType('no_results');
        return;
      }
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const recentReleases = soundcloudReleases.filter(release => {
        const releaseDate = new Date(release.created_at);
        return releaseDate > oneMonthAgo;
      });
      
      console.log(`${recentReleases.length} recent releases found out of ${soundcloudReleases.length} total`);
      
      const sortedReleases = recentReleases.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setReleases(sortedReleases);
      setErrorType(sortedReleases.length === 0 ? 'no_results' : 'none');
      setRetryCount(0);
      setNextRetryTime(null);
      
    } catch (fetchError) {
      console.error('Error fetching SoundCloud releases:', fetchError);
      setHasSearched(true);
      setReleases([]);
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
        setErrorType('rate_limit');
        setIsServiceAvailable(false);
        // Programmer un retry automatique dans 5 minutes
        const retryTime = Date.now() + 300000;
        setNextRetryTime(retryTime);
        setTimeout(() => {
          if (Date.now() >= retryTime) {
            console.log('Auto-retrying after rate limit cooldown...');
            fetchReleases(true);
          }
        }, 300000);
      } else {
        setErrorType('api_error');
        setIsServiceAvailable(false);
      }
    }
  }, [artistName, soundcloudUrl, getArtistReleases, retryCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReleases();
    }, Math.random() * 3000);
    
    return () => clearTimeout(timer);
  }, [fetchReleases]);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setNextRetryTime(null);
    fetchReleases(true);
  }, [fetchReleases]);

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
    return artworkUrl.replace('-large', '-t500x500') || artworkUrl;
  };

  if (loading) {
    return (
      <Card className="card-3d mb-8 border-orange-400/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
            <span className="ml-3 text-orange-400">Recherche SoundCloud...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errorType === 'no_soundcloud') {
    return (
      <Card className="card-3d mb-8 border-gray-600/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <WifiOff className="h-5 w-5" />
            <div>
              <p className="font-medium">SoundCloud non configuré</p>
              <p className="text-sm text-gray-500">
                Aucun profil SoundCloud trouvé pour {artistName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isServiceAvailable || error) {
    let errorIcon = WifiOff;
    let errorTitle = "Service SoundCloud indisponible";
    let errorDescription = "Le service SoundCloud rencontre des difficultés techniques.";
    let showRetry = true;

    if (errorType === 'rate_limit') {
      errorIcon = AlertTriangle;
      errorTitle = "Limite SoundCloud atteinte";
      errorDescription = nextRetryTime ? 
        `Trop de requêtes. Retry automatique programmé dans ${Math.round((nextRetryTime - Date.now()) / 60000)} minutes.` :
        "Limite de requêtes atteinte. Les données seront rechargées automatiquement.";
      showRetry = !nextRetryTime && retryCount < 3;
    } else if (errorType === 'api_error') {
      errorIcon = AlertTriangle;
      errorTitle = "Erreur API SoundCloud";
      errorDescription = error || "Une erreur s'est produite lors de la communication avec SoundCloud.";
      showRetry = retryCount < 2;
    }

    const IconComponent = errorIcon;

    return (
      <Card className="card-3d mb-8 border-orange-400/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-orange-400">
              <IconComponent className="h-5 w-5" />
              <div>
                <p className="font-medium">{errorTitle}</p>
                <p className="text-sm text-gray-400">{errorDescription}</p>
              </div>
            </div>
            {showRetry && (
              <Button 
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="border-orange-400/30 text-orange-300 hover:bg-orange-400/10"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Réessayer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasSearched && releases.length === 0 && errorType === 'no_results') {
    return (
      <Card className="card-3d mb-8 border-orange-400/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-orange-400">
              <Clock className="h-5 w-5" />
              <div>
                <p className="font-medium">Aucune sortie récente</p>
                <p className="text-sm text-gray-400">
                  Aucune sortie du dernier mois trouvée pour {artistName}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => fetchReleases()}
              variant="outline"
              size="sm"
              className="border-orange-400/30 text-orange-300 hover:bg-orange-400/10"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-3d mb-8">
      <CardHeader className="header-3d">
        <CardTitle className="flex items-center gap-2 text-white">
          <Music className="h-5 w-5 text-orange-400" />
          Sorties SoundCloud récentes
          <Badge variant="outline" className="border-orange-400/50 text-orange-400 bg-orange-400/10">
            {releases.length}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <div title="Service connecté">
              <Wifi className="h-4 w-4 text-green-400" />
            </div>
            <Button 
              onClick={() => fetchReleases()}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
