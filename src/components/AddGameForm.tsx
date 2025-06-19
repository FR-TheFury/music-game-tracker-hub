
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gamepad2, X, Plus, Info, ShoppingCart } from 'lucide-react';
import { SmartGameSearch } from './SmartGameSearch';

interface Game {
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  price?: string;
  discount?: string;
  releaseDate?: string;
  rawgUrl?: string;
  shopUrl?: string;
}

interface AddGameFormProps {
  onSubmit: (game: Game) => void;
  onCancel: () => void;
}

export const AddGameForm: React.FC<AddGameFormProps> = ({ onSubmit, onCancel }) => {
  const [showSmartSearch, setShowSmartSearch] = useState(true);
  const [formData, setFormData] = useState<Game>({
    name: '',
    platform: '',
    url: '',
    imageUrl: '',
    price: '',
    discount: '',
    releaseDate: '',
    rawgUrl: '',
    shopUrl: '',
  });

  const platforms = [
    'Steam',
    'Epic Games',
    'Xbox',
    'PlayStation',
    'Nintendo',
    'GOG',
    'Origin',
    'Ubisoft Store',
    'Battle.net',
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
        price: '', 
        discount: '', 
        releaseDate: '',
        rawgUrl: '',
        shopUrl: '',
      });
    }
  };

  const detectPlatform = (url: string) => {
    if (url.includes('store.steampowered.com')) return 'Steam';
    if (url.includes('store.epicgames.com')) return 'Epic Games';
    if (url.includes('microsoft.com') || url.includes('xbox.com')) return 'Xbox';
    if (url.includes('playstation.com') || url.includes('store.playstation.com')) return 'PlayStation';
    if (url.includes('nintendo.com')) return 'Nintendo';
    if (url.includes('gog.com')) return 'GOG';
    if (url.includes('origin.com')) return 'Origin';
    if (url.includes('ubisoft.com')) return 'Ubisoft Store';
    if (url.includes('battle.net')) return 'Battle.net';
    return '';
  };

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({
      ...prev,
      url,
      platform: detectPlatform(url) || prev.platform
    }));
  };

  const handleSmartSearchSelect = (game: any) => {
    console.log('Game selected from smart search:', game);
    setFormData({
      name: game.name,
      platform: game.platform,
      url: game.url,
      imageUrl: game.imageUrl || '',
      price: game.price || '',
      discount: game.discount || '',
      releaseDate: game.releaseDate || '',
      rawgUrl: game.rawgUrl || '', // Le lien RAWG trouvé automatiquement
      shopUrl: game.shopUrl || (game.url.includes('store.steampowered.com') ? game.url : ''),
    });
    setShowSmartSearch(false);
  };

  if (showSmartSearch) {
    return (
      <div className="space-y-4">
        <SmartGameSearch 
          onSelectGame={handleSmartSearchSelect}
          className="mb-4"
        />
        <div className="flex justify-center">
          <Button
            onClick={() => setShowSmartSearch(false)}
            variant="outline"
            className="border-slate-600 text-gray-300 hover:bg-slate-700/50"
          >
            Saisie manuelle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-slate-800/70 border-blue-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Gamepad2 className="h-5 w-5 text-blue-400" />
          Ajouter un nouveau jeu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button
            onClick={() => setShowSmartSearch(true)}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            Retour à la recherche intelligente
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">
                Nom du jeu *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Cyberpunk 2077"
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
              Lien principal du jeu *
            </Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://store.steampowered.com/app/..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              required
            />
            <p className="text-xs text-gray-500">
              Lien principal vers le jeu (boutique ou RAWG)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rawgUrl" className="text-gray-300 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-400" />
                Lien RAWG (optionnel)
              </Label>
              <Input
                id="rawgUrl"
                type="url"
                value={formData.rawgUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, rawgUrl: e.target.value }))}
                placeholder="https://rawg.io/games/..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">
                Lien vers la page RAWG pour les informations détaillées
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopUrl" className="text-gray-300 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-400" />
                Lien boutique (optionnel)
              </Label>
              <Input
                id="shopUrl"
                type="url"
                value={formData.shopUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, shopUrl: e.target.value }))}
                placeholder="https://store.steampowered.com/app/..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">
                Lien direct vers la boutique pour acheter le jeu
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-gray-300">
              Image du jeu (optionnel)
            </Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-300">
                Prix (optionnel)
              </Label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Ex: 59,99€"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount" className="text-gray-300">
                Réduction (optionnel)
              </Label>
              <Input
                id="discount"
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                placeholder="Ex: 25%"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseDate" className="text-gray-300">
                Date de sortie (optionnel)
              </Label>
              <Input
                id="releaseDate"
                value={formData.releaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                placeholder="Ex: 2024-12-10"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter le jeu
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
