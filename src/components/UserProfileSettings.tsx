
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Bell, Music, Gamepad2, Upload, Camera, Save, Loader2 } from 'lucide-react';

export const UserProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const { settings, loading: settingsLoading, updateSettings } = useNotificationSettings();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    username: '',
    avatarUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          username: data.username || '',
          avatarUrl: data.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));

      toast({
        title: "Photo de profil mise à jour",
        description: "Votre photo de profil a été uploadée avec succès.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader la photo de profil",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: profile.username,
          avatar_url: profile.avatarUrl,
        });

      if (error) throw error;

      toast({
        title: "Profil sauvegardé",
        description: "Vos informations de profil ont été mises à jour.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF0751]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Section */}
      <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm hover:shadow-[0_0_30px_rgba(255,7,81,0.3)] transition-all duration-500">
        <CardHeader className="bg-gradient-to-r from-[#FF0751]/10 to-transparent border-b border-[#FF0751]/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
              <User className="h-4 w-4 text-white" />
            </div>
            Profil Utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-[#FF0751]/30">
                <AvatarImage src={profile.avatarUrl} alt="Photo de profil" />
                <AvatarFallback className="bg-slate-700 text-white text-lg">
                  {profile.username.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 p-2 bg-[#FF0751] hover:bg-[#FF0751]/80 rounded-full cursor-pointer transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor="username" className="text-white mb-2 block">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Votre nom d'utilisateur"
                  className="bg-slate-700/50 border-[#FF0751]/30 text-white placeholder-gray-400 focus:border-[#FF0751]/50"
                />
              </div>
              
              <div>
                <Label className="text-white mb-2 block">Email</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-600/50 border-slate-600 text-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-[#FF0751] to-[#FF3971] hover:from-[#FF0751]/80 hover:to-[#FF3971]/80"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder le profil
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings Section */}
      {settings && (
        <Card className="bg-slate-800/90 border-[#FF0751]/30 shadow-2xl backdrop-blur-sm hover:shadow-[0_0_30px_rgba(255,7,81,0.3)] transition-all duration-500">
          <CardHeader className="bg-gradient-to-r from-[#FF6B9D]/10 to-transparent border-b border-[#FF6B9D]/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="p-2 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#FFB3CD] rose-glow">
                <Bell className="h-4 w-4 text-white" />
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
                  checked={settings.email_notifications_enabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ email_notifications_enabled: checked })
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
              
              {settings.email_notifications_enabled && (
                <div className="ml-6 space-y-2">
                  <Label className="text-sm text-gray-300">Fréquence</Label>
                  <Select
                    value={settings.notification_frequency}
                    onValueChange={(value: 'immediate' | 'daily' | 'disabled') =>
                      updateSettings({ notification_frequency: value })
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
                    checked={settings.artist_notifications_enabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ artist_notifications_enabled: checked })
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
                    checked={settings.game_notifications_enabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ game_notifications_enabled: checked })
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
      )}
    </div>
  );
};
