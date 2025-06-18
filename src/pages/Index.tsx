
import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/AuthPage";
import { RoleGuard } from "@/components/RoleGuard";
import { UserStatus } from "@/components/UserStatus";
import { UserProfile } from "@/components/UserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { Music, Gamepad2, LogOut, Settings, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AddArtistFormWrapper } from "@/components/AddArtistFormWrapper";
import { AddGameFormWrapper } from "@/components/AddGameFormWrapper";
import { ArtistsGrid } from "@/components/ArtistsGrid";
import { GamesGrid } from "@/components/GamesGrid";
import { NewReleasesSection } from "@/components/NewReleasesSection";
import { NotificationSettingsWrapper } from "@/components/NotificationSettingsWrapper";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { userRole } = useUserRole();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Music className="h-8 w-8 text-purple-400" />
                <Gamepad2 className="h-8 w-8 text-blue-400" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Mon Dashboard
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <UserStatus />
                <NotificationSettingsWrapper />
                
                {/* Admin Panel Access */}
                {userRole === 'admin' && (
                  <Button
                    onClick={() => navigate('/admin')}
                    variant="outline"
                    size="sm"
                    className="border-purple-400 text-purple-400 hover:bg-purple-400/10"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Administration
                  </Button>
                )}

                {/* User Profile Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Mon Profil
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
                    <UserProfile />
                  </DialogContent>
                </Dialog>

                <span className="text-gray-300 text-sm">
                  {user.email}
                </span>
                <Button 
                  onClick={signOut}
                  variant="outline" 
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Section Nouvelles Sorties */}
          <RoleGuard allowedRoles={['admin', 'editor', 'viewer']}>
            <NewReleasesSection />
          </RoleGuard>
          
          {/* Section Artistes */}
          <RoleGuard allowedRoles={['admin', 'editor', 'viewer']}>
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Music className="h-6 w-6 text-purple-400" />
                  Mes Artistes
                </h2>
                <RoleGuard allowedRoles={['admin', 'editor']}>
                  <AddArtistFormWrapper />
                </RoleGuard>
              </div>
              
              <ArtistsGrid />
            </section>
          </RoleGuard>

          {/* Section Jeux */}
          <RoleGuard allowedRoles={['admin', 'editor', 'viewer']}>
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="h-6 w-6 text-blue-400" />
                  Ma Liste de Souhaits
                </h2>
                <RoleGuard allowedRoles={['admin', 'editor']}>
                  <AddGameFormWrapper />
                </RoleGuard>
              </div>
              
              <GamesGrid />
            </section>
          </RoleGuard>
        </main>
      </div>
    </RoleGuard>
  );
};

export default Index;
