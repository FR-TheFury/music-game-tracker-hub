
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, Gamepad2, Calendar, Tag, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Game {
  id: string;
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  price?: string;
  discount?: string;
  releaseDate?: string;
  addedAt: string;
}

interface GameCardProps {
  game: Game;
  onRemove: (id: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onRemove }) => {
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
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300 group hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {game.imageUrl ? (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="w-12 h-12 rounded-lg object-cover shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getPlatformColor(game.platform)} flex items-center justify-center shadow-md ${game.imageUrl ? 'hidden' : ''}`}>
                <Gamepad2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                {game.name}
              </h3>
              <p className="text-sm text-gray-400">
                {game.platform}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(game.id)}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 mb-4">
          {game.price && (
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
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
          )}

          {game.releaseDate && (
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Sortie</span>
              </div>
              <span className="text-white text-sm">{game.releaseDate}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Ajouté le {formatDate(game.addedAt)}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400"
            >
              <Link to={`/game/${game.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Détails
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400"
            >
              <a href={game.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
