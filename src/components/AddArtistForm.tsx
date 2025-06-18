
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, X, Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { useSpotify } from '@/hooks/useSpotify';
import { useDeezer } from '@/hooks/useDeezer';

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
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [deezerResults, setDeezerResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('spotify');
  
  const { searchArtists: searchSpotifyArtists, loading: spotifyLoading } = useSpotify();
  const { searchArtists: searchDeezerArtists, loading: deezerLoading } = useDeezer();

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

  const searchArtists = async () => {
    if (!searchQuery.trim()) return;
    
    const [spotifyRes, deezerRes] = await Promise.all([
      searchSpotifyArtists(searchQuery),
      searchDeezerArtists(searchQuery)
    ]);
    
    setSpotifyResults(spotifyRes);
    setDeezerResults(deezerRes);
    setShowResults(true);
  };

  const selectSpotifyArtist = (artist: any) => {
    const imageUrl = artist.images?.[0]?.url || '';
    const multipleUrls = [
      { platform: 'Spotify', url: artist.external_urls?.spotify || '' }
    ];

    setFormData(prev => ({
      ...prev,
      name: artist.name,
      platform: 'Spotify',
      url: artist.external_urls?.spotify || '',
      spotifyId: artist.id,
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      followersCount: artist.followers?.total || 0,
      profileImageUrl: imageUrl,
      multipleUrls,
    }));
    setShowResults(false);
    setSearchQuery(artist.name);
  };

  const selectDeezerArtist = (artist: any) => {
    const imageUrl = artist.picture_xl || artist.picture_big || artist.picture_medium || '';
    const multipleUrls = [
      { platform: 'Deezer', url: artist.link || '' }
    ];

    setFormData(prev => ({
      ...prev,
      name: artist.name,
      platform: 'Deezer',
      url: artist.link || '',
      deezerId: artist.id,
      followersCount: artist.nb_fan || 0,
      profileImageUrl: imageUrl,
      multipleUrls,
    }));
    setShowResults(false);
    setSearchQuery(artist.name);
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

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery && searchQuery !== formData.name) {
        searchArtists();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

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
          {/* Recherche multi-plateformes */}
          <div className="space-y-2">
            <Label className="text-gray-300">Rechercher un artiste</Label>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tapez le nom d'un artiste..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {(spotifyLoading || deezerLoading) ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
            
            {/* Résultats de recherche avec onglets */}
            {showResults && (spotifyResults.length > 0 || deezerResults.length > 0) && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger value="spotify" className="text-white data-[state=active]:bg-green-600">
                    Spotify ({spotifyResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="deezer" className="text-white data-[state=active]:bg-orange-600">
                    Deezer ({deezerResults.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="spotify" className="mt-2">
                  <div className="bg-slate-700 border border-slate-600 rounded-md max-h-48 overflow-y-auto">
                    {spotifyResults.map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => selectSpotifyArtist(artist)}
                        className="p-3 hover:bg-slate-600 cursor-pointer flex items-center gap-3"
                      >
                        {artist.images?.[0] && (
                          <img 
                            src={artist.images[0].url} 
                            alt={artist.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="text-white font-medium">{artist.name}</div>
                          <div className="text-gray-400 text-sm">
                            {artist.followers?.total ? `${Math.floor(artist.followers.total / 1000)}k followers` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="deezer" className="mt-2">
                  <div className="bg-slate-700 border border-slate-600 rounded-md max-h-48 overflow-y-auto">
                    {deezerResults.map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => selectDeezerArtist(artist)}
                        className="p-3 hover:bg-slate-600 cursor-pointer flex items-center gap-3"
                      >
                        {artist.picture_medium && (
                          <img 
                            src={artist.picture_medium} 
                            alt={artist.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="text-white font-medium">{artist.name}</div>
                          <div className="text-gray-400 text-sm">
                            {artist.nb_fan ? `${Math.floor(artist.nb_fan / 1000)}k fans` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

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
