
import React from 'react';
import { useNewReleases } from '@/hooks/useNewReleases';
import { NewReleaseCard } from '@/components/NewReleaseCard';
import { Loader2, Bell, Clock } from 'lucide-react';

export const NewReleasesSection: React.FC = () => {
  const { releases, loading } = useNewReleases();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Aucune nouvelle sortie pour le moment.</p>
        <p className="text-gray-500 text-sm mt-2">
          Les nouvelles sorties de vos artistes et jeux suivis apparaîtront ici !
        </p>
      </div>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-yellow-400" />
        <h2 className="text-2xl font-bold text-white">Nouvelles Sorties</h2>
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-full">
          <Clock className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-yellow-400 font-medium">Expire dans 7 jours</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {releases.map((release) => (
          <NewReleaseCard key={release.id} release={release} />
        ))}
      </div>
    </section>
  );
};
