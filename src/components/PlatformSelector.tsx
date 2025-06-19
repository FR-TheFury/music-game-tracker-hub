
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Youtube, Headphones, Volume2, Settings } from 'lucide-react';

export interface PlatformConfig {
  spotify: boolean;
  deezer: boolean;
  youtube: boolean;
  soundcloud: boolean;
}

interface PlatformSelectorProps {
  platforms: PlatformConfig;
  onPlatformChange: (platforms: PlatformConfig) => void;
  className?: string;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  platforms,
  onPlatformChange,
  className = ""
}) => {
  const handlePlatformToggle = (platform: keyof PlatformConfig) => {
    onPlatformChange({
      ...platforms,
      [platform]: !platforms[platform]
    });
  };

  const platformsConfig = [
    {
      key: 'spotify' as const,
      label: 'Spotify',
      icon: Music,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      key: 'deezer' as const,
      label: 'Deezer',
      icon: Headphones,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      key: 'youtube' as const,
      label: 'YouTube',
      icon: Youtube,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      key: 'soundcloud' as const,
      label: 'SoundCloud',
      icon: Volume2,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10'
    }
  ];

  const enabledCount = Object.values(platforms).filter(Boolean).length;

  return (
    <Card className={`bg-slate-800/70 border-slate-600 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-sm">
          <Settings className="h-4 w-4 text-gray-400" />
          Plateformes de recherche
          <span className="ml-auto text-xs text-gray-400">
            {enabledCount}/{platformsConfig.length} actives
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {platformsConfig.map(({ key, label, icon: Icon, color, bgColor }) => (
          <div key={key} className="flex items-center space-x-3">
            <Checkbox
              id={key}
              checked={platforms[key]}
              onCheckedChange={() => handlePlatformToggle(key)}
              className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
            />
            <Label
              htmlFor={key}
              className={`flex items-center gap-2 text-sm cursor-pointer select-none ${
                platforms[key] ? 'text-white' : 'text-gray-400'
              }`}
            >
              <div className={`p-1 rounded ${bgColor}`}>
                <Icon className={`h-3 w-3 ${color}`} />
              </div>
              {label}
            </Label>
          </div>
        ))}
        
        {enabledCount === 0 && (
          <div className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded border border-yellow-400/20">
            ⚠️ Sélectionnez au moins une plateforme pour effectuer une recherche
          </div>
        )}
      </CardContent>
    </Card>
  );
};
