
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Music, X, Plus, Trash2 } from 'lucide-react';
import { SmartArtistSearch } from './SmartArtistSearch';

interface Artist {
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  lastRelease?: string;
  spotifyId?: string;
  deezerId?: number;
  bio?: string;
  genres?: string[];
  popularity?: number;
  followersCount?: number;
  multipleUrls?: Array<{ platform: string; url: string }>;
  profileImageUrl?: string;
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
    spotifyId: '',
    deezerId: undefined,
    bio: '',
    genres: [],
    popularity: 0,
    followersCount: 0,
    multipleUrls: [],
    profileImageUrl: '',
  });

  const [searchQuery, setSearchQuery] = useState('');

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
      setFormData({ 
        name: '', 
        platform: '', 
        url: '', 
        imageUrl: '', 
        lastRelease: '', 
        spotifyId: '',
        deezerId: undefined,
        bio: '',
        genres: [],
        popularity: 0,
        followersCount: 0,
        multipleUrls: [],
        profileImageUrl: '',
      });
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

  const handleSmartSelection = (artistData: any) => {
    setFormData(prev => ({
      ...prev,
      ...artistData,
    }));
  };

  const addUrlLink = () => {
    setFormData(prev => ({
      ...prev,
      multipleUrls: [...(prev.multipleUrls || []), { platform: '', url: '' }]
    }));
  };

  const updateUrlLink = (index: number, field: 'platform' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      multipleUrls: prev.multipleUrls?.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      ) || []
    }));
  };

  const removeUrlLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      multipleUrls: prev.multipleUrls?.filter((_, i) => i !== index) || []
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
          {/* Recherche intelligente */}
          <SmartArtistSearch
            onArtistSelect={handleSmartSelection}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

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
                Plateforme principale *
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
              Lien principal *
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
          </div>

          {/* Liens supplémentaires */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Liens supplémentaires</Label>
              <Button
                type="button"
                onClick={addUrlLink}
                size="sm"
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700/50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
            
            {formData.multipleUrls?.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Select 
                  value={link.platform} 
                  onValueChange={(value) => updateUrlLink(index, 'platform', value)}
                >
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white w-1/3">
                    <SelectValue placeholder="Plateforme" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {platforms.map((platform) => (
                      <SelectItem key={platform} value={platform} className="text-white hover:bg-slate-700">
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={link.url}
                  onChange={(e) => updateUrlLink(index, 'url', e.target.value)}
                  placeholder="URL"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 flex-1"
                />
                <Button
                  type="button"
                  onClick={() => removeUrlLink(index)}
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profileImageUrl" className="text-gray-300">
              URL de la photo de profil
            </Label>
            <Input
              id="profileImageUrl"
              type="url"
              value={formData.profileImageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, profileImageUrl: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-gray-300">
              Biographie
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Courte description de l'artiste..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              rows={3}
            />
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
