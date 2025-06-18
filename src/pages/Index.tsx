
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
      <div className="flex items-center justify-center min-h-screen bg-3d-main">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#FF0751] rose-glow"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  return (
    <RoleGuard>
      <div className="min-h-screen bg-3d-main">
        <header className="header-3d">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <div className="p-2 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#FFB3CD]">
                  <Gamepad2 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent">
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
                    variant="primary-3d"
                    size="sm"
                    className="rose-glow"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Administration
                  </Button>
                )}

                {/* User Profile Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="secondary-3d" 
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Mon Profil
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl card-3d">
                    <UserProfile />
                  </DialogContent>
                </Dialog>

                <span className="text-gray-300 text-sm">
                  {user.email}
                </span>
                <Button 
                  onClick={signOut}
                  variant="ghost-3d" 
                  size="sm"
                  className="text-[#FF0751] hover:text-white"
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
                  <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FFB3CD] rose-glow">
                    <Music className="h-5 w-5 text-white" />
                  </div>
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
                  <div className="p-2 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#FFB3CD]">
                    <Gamepad2 className="h-5 w-5 text-white" />
                  </div>
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
