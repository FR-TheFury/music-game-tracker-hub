
import React, { useState } from 'react';
import { RoleGuard } from '@/components/RoleGuard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useUserSearch } from '@/hooks/useUserSearch';
import { Search, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReadOnlyArtistsGrid } from '@/components/ReadOnlyArtistsGrid';
import { ReadOnlyGamesGrid } from '@/components/ReadOnlyGamesGrid';

export default function FriendsSearch() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { 
    searchResults, 
    userArtists, 
    userGames, 
    loading, 
    loadingUserData, 
    searchUsers, 
    getUserData 
  } = useUserSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers(searchTerm);
  };

  const handleUserSelect = async (user: any) => {
    setSelectedUser(user);
    await getUserData(user.user_id);
  };

  const handleBackToSearch = () => {
    setSelectedUser(null);
    setSearchTerm('');
  };

  return (
    <RoleGuard allowedRoles={['viewer']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900">
        <header className="bg-gradient-to-r from-[#FF0751]/20 to-slate-800/90 backdrop-blur-sm border-b border-[#FF0751]/30 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-[#FF0751]/20 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent">
                  Recherche d'amis
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedUser ? (
            // Interface de recherche
            <div className="space-y-6">
              <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Rechercher des amis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSearch} className="flex gap-4">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tapez le nom d'utilisateur..."
                      className="bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                    />
                    <Button 
                      type="submit" 
                      disabled={loading || !searchTerm.trim()}
                      className="bg-[#FF0751] hover:bg-[#FF3971] text-white"
                    >
                      {loading ? <LoadingSpinner size="sm" /> : 'Rechercher'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Résultats de recherche */}
              {searchResults.length > 0 && (
                <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Résultats de recherche</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {searchResults.map((user) => (
                        <div 
                          key={user.user_id}
                          className="flex items-center justify-between p-4 bg-slate-700/50 border border-[#FF0751]/20 rounded-lg hover:bg-slate-700/70 hover:border-[#FF0751]/40 transition-all duration-300 cursor-pointer"
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-500/20">
                              <User className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{user.username}</p>
                              <p className="text-xs text-gray-400">
                                Membre depuis {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={
                              user.role === 'admin' 
                                ? 'border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10' 
                                : user.role === 'editor' 
                                ? 'border-green-400 text-green-400 bg-green-400/10' 
                                : 'border-blue-400 text-blue-400 bg-blue-400/10'
                            }
                          >
                            {user.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Interface d'affichage des données utilisateur
            <div className="space-y-6">
              <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profil de {selectedUser.username}
                    </CardTitle>
                    <Button
                      onClick={handleBackToSearch}
                      variant="outline"
                      size="sm"
                      className="border-[#FF0751] text-[#FF0751] hover:bg-[#FF0751]/10"
                    >
                      Nouvelle recherche
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-blue-500/20">
                      <User className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white">{selectedUser.username}</p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={
                            selectedUser.role === 'admin' 
                              ? 'border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10' 
                              : selectedUser.role === 'editor' 
                              ? 'border-green-400 text-green-400 bg-green-400/10' 
                              : 'border-blue-400 text-blue-400 bg-blue-400/10'
                          }
                        >
                          {selectedUser.role}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          Membre depuis {new Date(selectedUser.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingUserData ? (
                <div className="text-center py-12">
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <p className="text-gray-400">Chargement des données...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Artistes */}
                  <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Artistes suivis ({userArtists.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReadOnlyArtistsGrid artists={userArtists} />
                    </CardContent>
                  </Card>

                  {/* Jeux */}
                  <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Liste de souhaits de jeux ({userGames.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReadOnlyGamesGrid games={userGames} />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
