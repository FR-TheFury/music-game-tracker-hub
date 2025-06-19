
import React from 'react';
import { UserGame } from '@/hooks/useUserSearch';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, ExternalLink, Tag, Calendar } from 'lucide-react';

interface ReadOnlyGamesGridProps {
  games: UserGame[];
}

export const ReadOnlyGamesGrid: React.FC<ReadOnlyGamesGridProps> = ({ games }) => {
  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 rounded-full bg-gray-500/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Gamepad2 className="h-8 w-8 text-gray-500" />
        </div>
        <p className="text-gray-400">Aucun jeu dans la liste de souhaits</p>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <div
          key={game.id}
          className="bg-slate-700/50 border border-[#FF0751]/20 rounded-lg p-4 hover:bg-slate-700/70 hover:border-[#FF0751]/40 transition-all duration-300 hover:shadow-lg hover:scale-105"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {game.image_url ? (
                <img
                  src={game.image_url}
                  alt={game.name}
                  className="w-16 h-16 rounded-lg object-cover shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${getPlatformColor(game.platform)} flex items-center justify-center shadow-md ${game.image_url ? 'hidden' : ''}`}>
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-lg truncate mb-1">{game.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-blue-400 text-blue-400 bg-blue-400/10 text-xs">
                  {game.platform}
                </Badge>
                {game.url && (
                  <a
                    href={game.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              <div className="space-y-1 mb-2 text-sm text-gray-400">
                {game.price && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-400 font-medium">{game.price}</span>
                    {game.discount && (
                      <Badge variant="outline" className="border-green-400 text-green-400 bg-green-400/10 text-xs ml-1">
                        -{game.discount}
                      </Badge>
                    )}
                  </div>
                )}
                {game.release_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span>Sortie: {game.release_date}</span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Ajouté le {new Date(game.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
