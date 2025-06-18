
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Users, Star, Calendar, Music, Play } from 'lucide-react';
import { useArtists } from '@/hooks/useArtists';
import { useSpotify } from '@/hooks/useSpotify';

const ArtistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artists, getArtistReleases } = useArtists();
  const { getArtistDetails } = useSpotify();
  
  const [artist, setArtist] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [spotifyReleases, setSpotifyReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArtistData = async () => {
      if (!id) return;

      // Trouver l'artiste dans la liste
      const foundArtist = artists.find(a => a.id === id);
      setArtist(foundArtist);

      if (foundArtist) {
        // Charger les sorties de la base de données
        const dbReleases = await getArtistReleases(id);
        setReleases(dbReleases);

        // Si l'artiste a un Spotify ID, charger les détails depuis Spotify
        if (foundArtist.spotifyId) {
          const spotifyData = await getArtistDetails(foundArtist.spotifyId);
          if (spotifyData) {
            setSpotifyReleases(spotifyData.releases);
          }
        }
      }

      setLoading(false);
    };

    loadArtistData();
  }, [id, artists]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getMainImage = () => {
    return artist?.profileImageUrl || artist?.imageUrl || '/placeholder.svg';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Artiste non trouvé</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="mb-6 border-slate-600 text-gray-300 hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Button>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0">
              <img
                src={getMainImage()}
                alt={artist.name}
                className="w-48 h-48 rounded-full object-cover border-4 border-purple-500/30"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-4">{artist.name}</h1>
              
              {artist.bio && (
                <p className="text-gray-300 text-lg mb-4 leading-relaxed">{artist.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 mb-6">
                {artist.followersCount && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="h-4 w-4" />
                    <span>{artist.followersCount.toLocaleString()} followers</span>
                  </div>
                )}
                
                {artist.popularity && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Star className="h-4 w-4" />
                    <span>Popularité: {artist.popularity}/100</span>
                  </div>
                )}
              </div>

              {artist.genres && artist.genres.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {artist.genres.map((genre: string) => (
                      <Badge key={genre} variant="outline" className="border-purple-500/50 text-purple-300">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Liens vers les plateformes */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Plateformes</h3>
                <div className="flex flex-wrap gap-3">
                  {artist.url && (
                    <Button variant="outline" size="sm" asChild className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                      <a href={artist.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {artist.platform}
                      </a>
                    </Button>
                  )}
                  
                  {artist.multipleUrls?.map((link: any, index: number) => (
                    <Button key={index} variant="outline" size="sm" asChild className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
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
        </div>

        {/* Sorties récentes */}
        {(spotifyReleases.length > 0 || releases.length > 0) && (
          <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Music className="h-5 w-5 text-purple-400" />
                Sorties récentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spotifyReleases.slice(0, 12).map((release: any) => (
                  <div key={release.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-start gap-3">
                      {release.images?.[0] && (
                        <img
                          src={release.images[0].url}
                          alt={release.name}
                          className="w-16 h-16 rounded object-cover flex-shrink-0"
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
                        {release.external_urls?.spotify && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="mt-2 p-0 h-auto text-green-400 hover:text-green-300"
                          >
                            <a href={release.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                              <Play className="h-3 w-3 mr-1" />
                              Écouter
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
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
