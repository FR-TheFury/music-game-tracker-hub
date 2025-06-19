
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { ArtistsGrid } from '@/components/ArtistsGrid';
import { GamesGrid } from '@/components/GamesGrid';
import { NewReleasesSection } from '@/components/NewReleasesSection';
import { CleanupButton } from '@/components/CleanupButton';
import { useUserRole } from '@/hooks/useUserRole';
import { RoleGuard } from '@/components/RoleGuard';
import { useArtists } from '@/hooks/useArtists';
import { useGames } from '@/hooks/useGames';

const Index = () => {
  const { user, loading } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const { artists, removeArtist } = useArtists();
  const { games, removeGame } = useGames();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Section Nouvelles Sorties */}
        <NewReleasesSection />

        {/* Section Admin/Editor - Actions de nettoyage */}
        <RoleGuard allowedRoles={['admin', 'editor']}>
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Actions Administratives</h2>
              <CleanupButton />
            </div>
          </section>
        </RoleGuard>

        {/* Section Artistes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Mes Artistes</h2>
          </div>
          <ArtistsGrid artists={artists} onDeleteArtist={removeArtist} />
        </section>

        {/* Section Jeux */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Mes Jeux</h2>
          </div>
          <GamesGrid games={games} onDeleteGame={removeGame} />
        </section>
      </div>
    </div>
  );
};

export default Index;
