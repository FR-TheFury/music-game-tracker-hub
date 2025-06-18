
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, X, Plus } from 'lucide-react';

interface Artist {
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  lastRelease?: string;
}

interface AddArtistFormProps {
  onSubmit: (artist: Artist) => void;
  onCancel: () => void;
}

export const AddArtistForm: React.FC<AddArtistFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Artist>({
    name: '',
    platform: '',
    url: '',
    imageUrl: '',
    lastRelease: '',
  });

  const platforms = [
    'Spotify',
    'Apple Music',
    'Deezer',
    'YouTube Music',
    'Amazon Music',
    'Tidal',
    'SoundCloud',
    'Bandcamp',
    'Autre'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.platform && formData.url) {
      onSubmit(formData);
      setFormData({ name: '', platform: '', url: '', imageUrl: '', lastRelease: '' });
    }
  };

  const detectPlatform = (url: string) => {
    if (url.includes('spotify.com')) return 'Spotify';
    if (url.includes('music.apple.com')) return 'Apple Music';
    if (url.includes('deezer.com')) return 'Deezer';
    if (url.includes('music.youtube.com')) return 'YouTube Music';
    if (url.includes('amazon.')) return 'Amazon Music';
    if (url.includes('tidal.com')) return 'Tidal';
    if (url.includes('soundcloud.com')) return 'SoundCloud';
    if (url.includes('bandcamp.com')) return 'Bandcamp';
    return '';
  };

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({
      ...prev,
      url,
      platform: detectPlatform(url) || prev.platform
    }));
  };

  return (
    <Card className="bg-slate-800/70 border-purple-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Music className="h-5 w-5 text-purple-400" />
          Ajouter un nouvel artiste
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">
                Nom de l'artiste *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Daft Punk"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform" className="text-gray-300">
                Plateforme *
              </Label>
              <Select 
                value={formData.platform} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Choisir une plateforme" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform} className="text-white hover:bg-slate-700">
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-gray-300">
              Lien vers l'artiste *
            </Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://open.spotify.com/artist/..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              required
            />
            <p className="text-xs text-gray-500">
              Collez le lien de l'artiste depuis votre plateforme de musique préférée
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastRelease" className="text-gray-300">
              Dernière sortie (optionnel)
            </Label>
            <Input
              id="lastRelease"
              value={formData.lastRelease}
              onChange={(e) => setFormData(prev => ({ ...prev, lastRelease: e.target.value }))}
              placeholder="Ex: Random Access Memories (2013)"
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter l'artiste
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-slate-600 text-gray-300 hover:bg-slate-700/50"
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
