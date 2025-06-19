import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Calendar, Music, Users } from 'lucide-react';
import { useArtists } from '@/hooks/useArtists';
import { useSpotify } from '@/hooks/useSpotify';
import { ArtistNewReleases } from '@/components/ArtistNewReleases';
import { ArtistSoundCloudReleases } from '@/components/ArtistSoundCloudReleases';

const ArtistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artists, loading: artistsLoading } = useArtists();
  const { getArtistDetails } = useSpotify();
  
  const [artist, setArtist] = useState<any>(null);
  const [spotifyReleases, setSpotifyReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadArtistData = async () => {
      if (!id) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      // Si les artistes sont encore en cours de chargement, attendre
      if (artistsLoading) {
        return;
      }

      console.log('Loading artist data for ID:', id);
      console.log('Available artists:', artists.length);
      
      const foundArtist = artists.find(a => a.id === id);
      console.log('Found artist:', foundArtist);
      
      if (!foundArtist) {
        console.log('Artist not found in list');
        setLoading(false);
        setNotFound(true);
        return;
      }
      
      setArtist(foundArtist);
      setNotFound(false);

      // Charger les données Spotify si disponibles
      if (foundArtist.spotifyId) {
        try {
          console.log('Loading Spotify data for:', foundArtist.spotifyId);
          const spotifyData = await getArtistDetails(foundArtist.spotifyId);
          if (spotifyData?.releases) {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            
            const recentSpotifyReleases = spotifyData.releases.filter((release: any) => {
              if (!release.release_date) return false;
              const releaseDate = new Date(release.release_date);
              return releaseDate > oneMonthAgo;
            });
            
            console.log('Recent Spotify releases:', recentSpotifyReleases);
            setSpotifyReleases(recentSpotifyReleases);
          }
        } catch (error) {
          console.error('Error loading Spotify data:', error);
        }
      }

      setLoading(false);
    };

    loadArtistData();
  }, [id, artists, artistsLoading, getArtistDetails]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M followers`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K followers`;
    }
    return `${count} followers`;
  };

  const getMainImage = () => {
    return artist?.profileImageUrl || artist?.imageUrl || '/placeholder.svg';
  };

  // Fonction pour extraire l'URL SoundCloud de l'artiste
  const getSoundCloudUrl = () => {
    if (artist?.multipleUrls) {
      const soundcloudLink = artist.multipleUrls.find((link: any) => 
        link.platform?.toLowerCase().includes('soundcloud') || 
        link.url?.toLowerCase().includes('soundcloud')
      );
      return soundcloudLink?.url;
    }
    return undefined;
  };

  // Affichage du loading pendant que les artistes se chargent
  if (artistsLoading || (loading && !notFound)) {
    return (
      <div className="min-h-screen bg-3d-main flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary rose-glow"></div>
      </div>
    );
  }

  // Affichage "non trouvé" seulement si vraiment pas trouvé
  if (notFound || (!artist && !artistsLoading && !loading)) {
    return (
      <div className="min-h-screen bg-3d-main flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Artiste non trouvé</h1>
          <p className="text-gray-400 mb-6">L'artiste demandé n'existe pas ou vous n'y avez pas accès.</p>
          <Button onClick={() => navigate('/')} variant="primary-3d">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-3d-main">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/')}
            variant="primary-3d"
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Button>

          <Card className="card-3d mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <img
                    src={getMainImage()}
                    alt={artist.name}
                    className="w-48 h-48 rounded-full object-cover border-4 border-primary/30 rose-glow"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline gap-4 mb-4">
                    <h1 className="text-4xl font-bold text-white">{artist.name}</h1>
                    {artist.followersCount && (
                      <div className="flex items-center gap-2 text-primary">
                        <Users className="h-5 w-5" />
                        <span className="text-lg font-medium">{formatFollowers(artist.followersCount)}</span>
                      </div>
                    )}
                  </div>
                  
                  {artist.bio && (
                    <p className="text-gray-300 text-lg mb-4 leading-relaxed">{artist.bio}</p>
                  )}

                  {artist.genres && artist.genres.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-2">Genres</h3>
                      <div className="flex flex-wrap gap-2">
                        {artist.genres.map((genre: string) => (
                          <Badge key={genre} variant="outline" className="border-primary/50 text-primary bg-primary/10">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Plateformes</h3>
                    <div className="flex flex-wrap gap-3">
                      {artist.url && (
                        <Button variant="secondary-3d" size="sm" asChild>
                          <a href={artist.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {artist.platform}
                          </a>
                        </Button>
                      )}
                      
                      {artist.multipleUrls?.map((link: any, index: number) => (
                        <Button key={index} variant="secondary-3d" size="sm" asChild>
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {link.platform}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ArtistNewReleases 
          artistId={id!} 
          artistPlatforms={artist.multipleUrls || []} 
        />

        <ArtistSoundCloudReleases 
          artistName={artist.name}
          soundcloudUrl={getSoundCloudUrl()}
        />

        {spotifyReleases.length > 0 && (
          <Card className="card-3d mb-8">
            <CardHeader className="header-3d">
              <CardTitle className="flex items-center gap-2 text-white">
                <Music className="h-5 w-5 text-green-400" />
                Sorties Spotify récentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spotifyReleases.map((release: any) => (
                  <div key={release.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-primary/50 transition-all duration-300">
                    <div className="flex items-start gap-3 mb-3">
                      {release.images?.[0] && (
                        <img
                          src={release.images[0].url}
                          alt={release.name}
                          className="w-16 h-16 rounded object-cover flex-shrink-0 border border-primary/20"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{release.name}</h4>
                        <p className="text-sm text-gray-400 capitalize">{release.album_type}</p>
                        {release.release_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(release.release_date)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {release.external_urls?.spotify && (
                      <Button
                        variant="success-3d"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <a href={release.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Écouter sur Spotify
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {artist.addedAt && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Artiste ajouté le {formatDate(artist.addedAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistDetail;
