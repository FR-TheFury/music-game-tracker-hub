
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
      <Card className="bg-slate-800/70 border-slate-700">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Settings className="h-5 w-5 text-purple-400" />
          Paramètres de Notification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email notifications */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="email-notifications"
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ emailNotificationsEnabled: checked })
              }
            />
            <Label htmlFor="email-notifications" className="text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
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
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
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
            <Bell className="h-4 w-4 text-yellow-400" />
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
              />
              <Label htmlFor="artist-notifications" className="text-white flex items-center gap-2">
                <Music className="h-4 w-4 text-purple-400" />
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
              />
              <Label htmlFor="game-notifications" className="text-white flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-blue-400" />
                Nouvelles sorties de jeux
              </Label>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-gray-400">
            Les notifications apparaissent sur le dashboard et sont automatiquement supprimées après 7 jours.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
