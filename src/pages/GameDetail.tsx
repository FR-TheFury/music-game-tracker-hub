
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ExternalLink, Calendar, Tag, Gamepad2, Star, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Game {
  id: string;
  name: string;
  platform: string;
  url: string;
  image_url?: string;
  price?: string;
  discount?: string;
  release_date?: string;
  release_status?: string;
  expected_release_date?: string;
  rawg_url?: string;
  shop_url?: string;
  created_at: string;
  updated_at: string;
  last_status_check?: string;
}

const GameDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: game, isLoading, error } = useQuery({
    queryKey: ['game', id],
    queryFn: async () => {
      if (!id) throw new Error('Game ID is required');
      
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Game;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <Card className="bg-slate-800/70 border-red-500/30 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Jeu introuvable</h2>
            <p className="text-gray-300 mb-6">Le jeu demandé n'existe pas ou n'est plus disponible.</p>
            <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'steam':
        return 'from-blue-600 to-blue-700';
      case 'epic games':
        return 'from-gray-700 to-gray-800';
      case 'xbox':
        return 'from-green-600 to-green-700';
      case 'playstation':
        return 'from-blue-700 to-indigo-700';
      case 'nintendo':
        return 'from-red-600 to-red-700';
      default:
        return 'from-cyan-500 to-blue-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'released':
        return <Badge className="bg-green-600 hover:bg-green-700">Sorti</Badge>;
      case 'coming_soon':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">Bientôt disponible</Badge>;
      case 'early_access':
        return <Badge className="bg-purple-600 hover:bg-purple-700">Accès anticipé</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-500 text-gray-400">Statut inconnu</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'accueil
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image et informations principales */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/70 border-blue-500/30 backdrop-blur-sm sticky top-8">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  {game.image_url ? (
                    <img
                      src={game.image_url}
                      alt={game.name}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full max-w-sm mx-auto h-64 rounded-lg bg-gradient-to-r ${getPlatformColor(game.platform)} flex items-center justify-center shadow-lg ${game.image_url ? 'hidden' : ''}`}>
                    <Gamepad2 className="h-16 w-16 text-white" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Badge variant="outline" className="border-blue-400 text-blue-400 bg-blue-400/10">
                      {game.platform}
                    </Badge>
                  </div>

                  {game.release_status && (
                    <div className="flex justify-center">
                      {getStatusBadge(game.release_status)}
                    </div>
                  )}

                  {game.price && (
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-medium text-yellow-400">Prix</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{game.price}</span>
                          {game.discount && (
                            <Badge variant="destructive" className="bg-green-600 hover:bg-green-700">
                              -{game.discount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Détails du jeu */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-800/70 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
                  <Gamepad2 className="h-8 w-8 text-blue-400" />
                  {game.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dates importantes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {game.release_date && (
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Date de sortie</span>
                      </div>
                      <p className="text-white">{game.release_date}</p>
                    </div>
                  )}

                  {game.expected_release_date && (
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-400">Sortie prévue</span>
                      </div>
                      <p className="text-white">{new Date(game.expected_release_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>

                <Separator className="bg-slate-600" />

                {/* Liens */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Link className="h-5 w-5 text-blue-400" />
                    Liens
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      asChild
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400"
                    >
                      <a href={game.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Page officielle
                      </a>
                    </Button>

                    {game.rawg_url && (
                      <Button
                        variant="outline"
                        asChild
                        className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400"
                      >
                        <a href={game.rawg_url} target="_blank" rel="noopener noreferrer">
                          <Star className="h-4 w-4 mr-2" />
                          RAWG
                        </a>
                      </Button>
                    )}

                    {game.shop_url && (
                      <Button
                        variant="outline"
                        asChild
                        className="border-green-500/30 text-green-300 hover:bg-green-500/10 hover:border-green-400"
                      >
                        <a href={game.shop_url} target="_blank" rel="noopener noreferrer">
                          <Tag className="h-4 w-4 mr-2" />
                          Boutique
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="bg-slate-600" />

                {/* Informations techniques */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Informations</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Ajouté le :</span>
                      <p className="text-white">{formatDate(game.created_at)}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Dernière mise à jour :</span>
                      <p className="text-white">{formatDate(game.updated_at)}</p>
                    </div>

                    {game.last_status_check && (
                      <div>
                        <span className="text-gray-400">Dernière vérification :</span>
                        <p className="text-white">{formatDate(game.last_status_check)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetail;
