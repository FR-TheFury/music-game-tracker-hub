import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Gamepad2, Search, Shield, User } from 'lucide-react';
import { AddArtistForm } from '@/components/AddArtistForm';
import { AddGameForm } from '@/components/AddGameForm';
import { ArtistsGrid } from '@/components/ArtistsGrid';
import { GamesGrid } from '@/components/GamesGrid';
import { NewReleasesSection } from '@/components/NewReleasesSection';
import { useArtists } from '@/hooks/useArtists';
import { useGames } from '@/hooks/useGames';
import { UserStatus } from '@/components/UserStatus';
import { useUserRoleContext } from '@/contexts/UserRoleContext';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/components/RoleGuard';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileMenu } from '@/components/MobileMenu';

export default function Index() {
  const { artists, loading: artistsLoading, addArtist, removeArtist } = useArtists();
  const { games, loading: gamesLoading, addGame, removeGame } = useGames();
  const [showAddArtistForm, setShowAddArtistForm] = useState(false);
  const [showAddGameForm, setShowAddGameForm] = useState(false);

  const { userRole } = useUserRoleContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleDeleteArtist = async (artistId: string) => {
    try {
      await removeArtist(artistId);
    } catch (error) {
      console.error("Error deleting artist:", error);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      await removeGame(gameId);
    } catch (error) {
      console.error("Error deleting game:", error);
    }
  };

  const handleAddArtist = async (artistData: any) => {
    try {
      await addArtist(artistData);
      setShowAddArtistForm(false);
    } catch (error) {
      console.error("Error adding artist:", error);
    }
  };

  const handleAddGame = async (gameData: any) => {
    try {
      await addGame(gameData);
      setShowAddGameForm(false);
    } catch (error) {
      console.error("Error adding game:", error);
    }
  };

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900">
        <header className="bg-gradient-to-r from-[#FF0751]/20 to-slate-800/90 backdrop-blur-sm border-b border-[#FF0751]/30 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              {/* Section gauche : Logo + Titre */}
              <div className="flex items-center min-w-0">
                {isMobile && <MobileMenu />}
                <div className="p-1.5 sm:p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow flex-shrink-0 ml-2 sm:ml-0">
                  <Music className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <h1 className="ml-2 sm:ml-3 text-sm sm:text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent truncate">
                  {isMobile ? "Tracker" : "Artist & Game Tracker"}
                </h1>
              </div>
              
              {/* Section droite : Boutons navigation + Déconnexion + Avatar */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Boutons navigation (desktop seulement) */}
                {!isMobile && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => navigate('/complete-profile')}
                      variant="outline"
                      size="sm"
                      className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10 transition-all duration-300"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Mon Profil
                    </Button>
                    
                    <Button
                      onClick={() => navigate('/friends')}
                      variant="outline"
                      size="sm"
                      className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10 transition-all duration-300"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Rechercher des amis
                    </Button>
                    
                    {userRole === 'admin' && (
                      <Button
                        onClick={() => navigate('/admin')}
                        variant="outline"
                        size="sm"
                        className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10 transition-all duration-300"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Administration
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Profil utilisateur (maintenant à l'extrême droite) */}
                <UserStatus />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="space-y-4 sm:space-y-8">
            {/* Section Nouvelles Sorties */}
            <NewReleasesSection />

            {/* Message d'information pour les viewers */}
            {userRole === 'viewer' && (
              <Card className="bg-slate-800/90 border-slate-700">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm sm:text-base">Mode Viewer</p>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Vous pouvez consulter vos données et rechercher des amis pour voir leurs artistes et jeux favoris.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formulaires d'ajout - cachés pour les viewers */}
            {userRole !== 'viewer' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {!showAddArtistForm ? (
                  <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                    <CardHeader className="pb-3 sm:pb-6">
                      <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                        <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                        Ajouter un Artiste
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => setShowAddArtistForm(true)}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm sm:text-base"
                      >
                        <Music className="h-4 w-4 mr-2" />
                        Nouveau Artiste
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <AddArtistForm
                    onSubmit={handleAddArtist}
                    onCancel={() => setShowAddArtistForm(false)}
                  />
                )}

                {!showAddGameForm ? (
                  <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                    <CardHeader className="pb-3 sm:pb-6">
                      <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                        <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        Ajouter un Jeu
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => setShowAddGameForm(true)}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm sm:text-base"
                      >
                        <Gamepad2 className="h-4 w-4 mr-2" />
                        Nouveau Jeu
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <AddGameForm
                    onSubmit={handleAddGame}
                    onCancel={() => setShowAddGameForm(false)}
                  />
                )}
              </div>
            )}

            {/* Grilles d'affichage */}
            <div className="space-y-4 sm:space-y-8">
              <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                    Mes Artistes ({artists.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {artistsLoading ? (
                    <div className="text-center text-gray-400 text-sm sm:text-base">Chargement des artistes...</div>
                  ) : (
                    <ArtistsGrid 
                      artists={artists} 
                      onDeleteArtist={userRole !== 'viewer' ? handleDeleteArtist : undefined} 
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Ma Liste de Souhaits ({games.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gamesLoading ? (
                    <div className="text-center text-gray-400 text-sm sm:text-base">Chargement des jeux...</div>
                  ) : (
                    <GamesGrid 
                      games={games} 
                      onDeleteGame={userRole !== 'viewer' ? handleDeleteGame : undefined} 
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
