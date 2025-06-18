
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Bell, Mail, Music, Gamepad2, Settings, Loader2 } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useNotificationSettings();

  if (loading) {
    return (
      <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF0751]" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm hover:shadow-[0_0_30px_rgba(255,7,81,0.3)] transition-all duration-500">
      <CardHeader className="bg-gradient-to-r from-[#FF0751]/10 to-transparent border-b border-[#FF0751]/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
            <Settings className="h-4 w-4 text-white" />
          </div>
          Paramètres de Notification
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Email notifications */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="email-notifications"
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ emailNotificationsEnabled: checked })
              }
              className="data-[state=checked]:bg-[#FF0751]"
            />
            <Label htmlFor="email-notifications" className="text-white flex items-center gap-2">
              <div className="p-1 rounded-full bg-blue-500/20">
                <Mail className="h-3 w-3 text-blue-400" />
              </div>
              Notifications par email
            </Label>
          </div>
          
          {settings.emailNotificationsEnabled && (
            <div className="ml-6 space-y-2">
              <Label className="text-sm text-gray-300">Fréquence</Label>
              <Select
                value={settings.notificationFrequency}
                onValueChange={(value: 'immediate' | 'daily' | 'disabled') =>
                  updateSettings({ notificationFrequency: value })
                }
              >
                <SelectTrigger className="w-48 bg-slate-700/50 border-[#FF0751]/30 text-white hover:border-[#FF0751]/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-[#FF0751]/30">
                  <SelectItem value="immediate">Immédiat</SelectItem>
                  <SelectItem value="daily">Résumé quotidien</SelectItem>
                  <SelectItem value="disabled">Désactivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Type notifications */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <div className="p-1 rounded-full bg-yellow-500/20">
              <Bell className="h-3 w-3 text-yellow-400" />
            </div>
            Types de notifications
          </h4>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="artist-notifications"
                checked={settings.artistNotificationsEnabled}
                onCheckedChange={(checked) =>
                  updateSettings({ artistNotificationsEnabled: checked })
                }
                className="data-[state=checked]:bg-[#FF0751]"
              />
              <Label htmlFor="artist-notifications" className="text-white flex items-center gap-2">
                <div className="p-1 rounded-full bg-[#FF0751]/20">
                  <Music className="h-3 w-3 text-[#FF0751]" />
                </div>
                Nouvelles sorties d'artistes
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="game-notifications"
                checked={settings.gameNotificationsEnabled}
                onCheckedChange={(checked) =>
                  updateSettings({ gameNotificationsEnabled: checked })
                }
                className="data-[state=checked]:bg-[#FF6B9D]"
              />
              <Label htmlFor="game-notifications" className="text-white flex items-center gap-2">
                <div className="p-1 rounded-full bg-[#FF6B9D]/20">
                  <Gamepad2 className="h-3 w-3 text-[#FF6B9D]" />
                </div>
                Nouvelles sorties de jeux
              </Label>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-600">
          <p className="text-xs text-gray-400">
            Les notifications apparaissent sur le dashboard et sont automatiquement supprimées après 7 jours.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
