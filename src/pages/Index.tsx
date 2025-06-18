
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Gamepad2, Plus, TrendingUp, LogOut, User } from 'lucide-react';
import { ArtistCard } from '@/components/ArtistCard';
import { GameCard } from '@/components/GameCard';
import { AddArtistForm } from '@/components/AddArtistForm';
import { AddGameForm } from '@/components/AddGameForm';
import { AuthPage } from '@/components/AuthPage';
import { useAuth } from '@/hooks/useAuth';
import { useArtists } from '@/hooks/useArtists';
import { useGames } from '@/hooks/useGames';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const { artists, loading: artistsLoading, addArtist, removeArtist } = useArtists();
  const { games, loading: gamesLoading, addGame, removeGame } = useGames();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  const handleAddArtist = async (artistData: any) => {
    await addArtist(artistData);
    setShowAddArtist(false);
  };

  const handleAddGame = async (gameData: any) => {
    await addGame(gameData);
    setShowAddGame(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-purple-400" />
              <span className="text-xl text-white">
                Bonjour, {user.email}
              </span>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </Button>
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-4">
            Mon Dashboard Perso
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Suivez vos artistes favoris et surveillez les jeux que vous voulez acheter, 
            tout en un seul endroit !
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm font-medium">Artistes suivis</p>
                  <p className="text-3xl font-bold text-white">{artists.length}</p>
                </div>
                <Music className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium">Jeux surveillés</p>
                  <p className="text-3xl font-bold text-white">{games.length}</p>
                </div>
                <Gamepad2 className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm font-medium">Total éléments</p>
                  <p className="text-3xl font-bold text-white">{artists.length + games.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Artists Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Music className="h-8 w-8 text-purple-400" />
              <h2 className="text-3xl font-bold text-white">Mes Artistes</h2>
            </div>
            <Button
              onClick={() => setShowAddArtist(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un artiste
            </Button>
          </div>

          {showAddArtist && (
            <div className="mb-8">
              <AddArtistForm
                onSubmit={handleAddArtist}
                onCancel={() => setShowAddArtist(false)}
              />
            </div>
          )}

          {artistsLoading ? (
            <div className="text-center text-gray-400">Chargement des artistes...</div>
          ) : artists.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Aucun artiste suivi
                </h3>
                <p className="text-gray-500 mb-6">
                  Commencez par ajouter vos artistes favoris pour suivre leurs nouvelles sorties !
                </p>
                <Button
                  onClick={() => setShowAddArtist(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier artiste
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  onRemove={removeArtist}
                />
              ))}
            </div>
          )}
        </section>

        {/* Games Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-blue-400" />
              <h2 className="text-3xl font-bold text-white">Mes Jeux</h2>
            </div>
            <Button
              onClick={() => setShowAddGame(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un jeu
            </Button>
          </div>

          {showAddGame && (
            <div className="mb-8">
              <AddGameForm
                onSubmit={handleAddGame}
                onCancel={() => setShowAddGame(false)}
              />
            </div>
          )}

          {gamesLoading ? (
            <div className="text-center text-gray-400">Chargement des jeux...</div>
          ) : games.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Gamepad2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Aucun jeu surveillé
                </h3>
                <p className="text-gray-500 mb-6">
                  Ajoutez des jeux à votre liste de souhaits pour surveiller leurs promotions !
                </p>
                <Button
                  onClick={() => setShowAddGame(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier jeu
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onRemove={removeGame}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Index;
