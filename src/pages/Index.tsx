
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Gamepad2, Search, Shield } from 'lucide-react';
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
import { AdminTabs } from '@/components/AdminTabs';
import { RoleGuard } from '@/components/RoleGuard';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const { artists, loading: artistsLoading, removeArtist } = useArtists();
  const { games, loading: gamesLoading, removeGame } = useGames();

  const { userRole } = useUserRoleContext();
  const navigate = useNavigate();

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

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900">
        <header className="bg-gradient-to-r from-[#FF0751]/20 to-slate-800/90 backdrop-blur-sm border-b border-[#FF0751]/30 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <h1 className="ml-3 text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent">
                  Artist & Game Tracker
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Bouton de recherche d'amis pour tous les rôles */}
                <Button
                  onClick={() => navigate('/friends')}
                  variant="outline"
                  size="sm"
                  className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10 transition-all duration-300"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher des amis
                </Button>
                
                {/* Bouton admin pour les admins */}
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
                
                <UserStatus />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Section Nouvelles Sorties */}
            <NewReleasesSection />

            {/* Section Admin pour les admins uniquement */}
            {userRole === 'admin' && <AdminTabs />}

            {/* Message d'information pour les viewers */}
            {userRole === 'viewer' && (
              <Card className="bg-slate-800/90 border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                    <Search className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">Mode Viewer</p>
                      <p className="text-gray-300 text-sm">
                        Vous pouvez consulter vos données et rechercher des amis pour voir leurs artistes et jeux favoris.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formulaires d'ajout - cachés pour les viewers */}
            {userRole !== 'viewer' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Music className="h-5 w-5" />
                      Ajouter un Artiste
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AddArtistForm />
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Gamepad2 className="h-5 w-5" />
                      Ajouter un Jeu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AddGameForm />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Grilles d'affichage */}
            <div className="space-y-8">
              <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Music className="h-5 w-5" />
                    Mes Artistes ({artists.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {artistsLoading ? (
                    <div className="text-center text-gray-400">Chargement des artistes...</div>
                  ) : (
                    <ArtistsGrid 
                      artists={artists} 
                      onDeleteArtist={userRole !== 'viewer' ? handleDeleteArtist : undefined} 
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Gamepad2 className="h-5 w-5" />
                    Ma Liste de Souhaits ({games.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gamesLoading ? (
                    <div className="text-center text-gray-400">Chargement des jeux...</div>
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
