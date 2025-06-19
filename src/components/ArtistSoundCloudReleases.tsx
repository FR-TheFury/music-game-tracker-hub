import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null);
  const [rateLimitCooldown, setRateLimitCooldown] = useState<number | null>(null);
  
  // Refs pour éviter les boucles infinies
  const retryCountRef = useRef(0);
  const lastRequestTimeRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  
  const { getArtistReleases, loading, error } = useSoundCloud();

  // Cache local pour éviter les requêtes répétées
  const cacheRef = useRef<Map<string, { data: SoundCloudRelease[], timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = useCallback((name: string, url?: string) => {
    return `${name}-${url || 'no-url'}`;
  }, []);

  const getCachedData = useCallback((key: string) => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((key: string, data: SoundCloudRelease[]) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const resetState = useCallback(() => {
    setErrorType('none');
    setIsServiceAvailable(true);
    setRateLimitCooldown(null);
    setNextRetryTime(null);
  }, []);

  const handleRateLimitError = useCallback(() => {
    console.log('SoundCloud rate limit detected, entering cooldown mode');
    setErrorType('rate_limit');
    setIsServiceAvailable(false);
    setIsRequestInProgress(false);
    
    // Cooldown de 10 minutes pour le rate limit
    const cooldownTime = Date.now() + 10 * 60 * 1000;
    setRateLimitCooldown(cooldownTime);
    
    // Reset automatique après le cooldown
    setTimeout(() => {
      console.log('Rate limit cooldown expired');
      setRateLimitCooldown(null);
      setErrorType('none');
      setIsServiceAvailable(true);
      retryCountRef.current = 0;
    }, 10 * 60 * 1000);
  }, []);

  const fetchReleases = useCallback(async (isManualRetry = false) => {
    // Vérifications préliminaires
    if (!artistName || isRequestInProgress) {
      return;
    }

    if (!soundcloudUrl) {
      console.log('No SoundCloud URL configured for', artistName);
      setHasSearched(true);
      setErrorType('no_soundcloud');
      setIsServiceAvailable(true);
      setReleases([]);
      return;
    }

    // Vérifier le rate limit cooldown
    if (rateLimitCooldown && Date.now() < rateLimitCooldown) {
      console.log('Still in rate limit cooldown');
      return;
    }

    // Vérifier le cache
    const cacheKey = getCacheKey(artistName, soundcloudUrl);
    const cachedData = getCachedData(cacheKey);
    if (cachedData && !isManualRetry) {
      console.log('Using cached SoundCloud data for', artistName);
      setReleases(cachedData);
      setHasSearched(true);
      setErrorType(cachedData.length === 0 ? 'no_results' : 'none');
      return;
    }

    // Protection contre les requêtes trop fréquentes
    const now = Date.now();
    if (lastRequestTimeRef.current && now - lastRequestTimeRef.current < 5000 && !isManualRetry) {
      console.log('Skipping request - too frequent');
      return;
    }

    setIsRequestInProgress(true);
    setHasSearched(false);
    resetState();
    lastRequestTimeRef.current = now;

    try {
      console.log('Fetching SoundCloud releases for:', artistName, soundcloudUrl);
      
      // Backoff exponentiel pour les retries
      if (!isManualRetry && retryCountRef.current > 0) {
        const waitTime = Math.min(retryCountRef.current * 2000, 10000);
        console.log(`Waiting ${waitTime}ms before retry (attempt ${retryCountRef.current + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const soundcloudReleases = await getArtistReleases(artistName, soundcloudUrl, 15);
      
      console.log('SoundCloud releases received:', soundcloudReleases?.length || 0);
      
      if (!soundcloudReleases || soundcloudReleases.length === 0) {
        console.log('No SoundCloud releases found for', artistName);
        setReleases([]);
        setErrorType('no_results');
        setCachedData(cacheKey, []);
      } else {
        // Filtrer les sorties récentes (dernier mois)
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const recentReleases = soundcloudReleases.filter(release => {
          const releaseDate = new Date(release.created_at);
          return releaseDate > oneMonthAgo;
        });
        
        const sortedReleases = recentReleases.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        console.log(`${sortedReleases.length} recent releases found out of ${soundcloudReleases.length} total`);
        
        setReleases(sortedReleases);
        setErrorType(sortedReleases.length === 0 ? 'no_results' : 'none');
        setCachedData(cacheKey, sortedReleases);
      }
      
      setHasSearched(true);
      setIsServiceAvailable(true);
      retryCountRef.current = 0;
      
    } catch (fetchError) {
      console.error('Error fetching SoundCloud releases:', fetchError);
      setHasSearched(true);
      setReleases([]);
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      
      if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
        handleRateLimitError();
      } else {
        setErrorType('api_error');
        setIsServiceAvailable(false);
        
        // Limiter les retries automatiques
        if (retryCountRef.current < 2 && !isManualRetry) {
          retryCountRef.current++;
          console.log(`Scheduling retry ${retryCountRef.current} in 5 seconds`);
          setTimeout(() => {
            if (!isRequestInProgress) {
              fetchReleases();
            }
          }, 5000);
        }
      }
    } finally {
      setIsRequestInProgress(false);
    }
  }, [
    artistName, 
    soundcloudUrl, 
    getArtistReleases, 
    rateLimitCooldown,
    getCacheKey,
    getCachedData,
    setCachedData,
    resetState,
    handleRateLimitError
  ]);

  // Effect initial - ne se déclenche qu'une fois
  useEffect(() => {
    if (!hasInitializedRef.current && artistName) {
      hasInitializedRef.current = true;
      // Délai aléatoire pour éviter les requêtes simultanées
      const delay = Math.random() * 2000 + 1000; // 1-3 secondes
      
      const timer = setTimeout(() => {
        fetchReleases();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [artistName, fetchReleases]);

  const handleManualRetry = useCallback(() => {
    retryCountRef.current = 0;
    setRateLimitCooldown(null);
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

  if (loading || isRequestInProgress) {
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
    let isInCooldown = false;

    if (errorType === 'rate_limit') {
      errorIcon = AlertTriangle;
      errorTitle = "Limite SoundCloud atteinte";
      
      if (rateLimitCooldown) {
        const remainingTime = Math.max(0, Math.ceil((rateLimitCooldown - Date.now()) / 60000));
        errorDescription = `Limite de requêtes atteinte. Retry automatique dans ${remainingTime} minute${remainingTime > 1 ? 's' : ''}.`;
        isInCooldown = true;
        showRetry = false;
      } else {
        errorDescription = "Limite de requêtes atteinte. Vous pouvez réessayer maintenant.";
      }
    } else if (errorType === 'api_error') {
      errorIcon = AlertTriangle;
      errorTitle = "Erreur API SoundCloud";
      errorDescription = error || "Une erreur s'est produite lors de la communication avec SoundCloud.";
      showRetry = retryCountRef.current < 3;
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
                {isInCooldown && (
                  <p className="text-xs text-gray-500 mt-1">
                    Le système respecte les limites de l'API pour éviter les blocages.
                  </p>
                )}
              </div>
            </div>
            {showRetry && (
              <Button 
                onClick={handleManualRetry}
                variant="outline"
                size="sm"
                className="border-orange-400/30 text-orange-300 hover:bg-orange-400/10"
                disabled={loading || isRequestInProgress}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isRequestInProgress) ? 'animate-spin' : ''}`} />
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
              onClick={handleManualRetry}
              variant="outline"
              size="sm"
              className="border-orange-400/30 text-orange-300 hover:bg-orange-400/10"
              disabled={loading || isRequestInProgress}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isRequestInProgress) ? 'animate-spin' : ''}`} />
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
              onClick={handleManualRetry}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              disabled={loading || isRequestInProgress}
            >
              <RefreshCw className={`h-4 w-4 ${(loading || isRequestInProgress) ? 'animate-spin' : ''}`} />
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
