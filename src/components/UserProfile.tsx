
import React from 'react';
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { LogOut, User, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';

export const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { userRole } = useUserRole();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  const getRoleBadgeClass = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10 hover:bg-[#FF0751]/20';
      case 'editor':
        return 'border-green-400 text-green-400 bg-green-400/10 hover:bg-green-400/20';
      case 'viewer':
        return 'border-blue-400 text-blue-400 bg-blue-400/10 hover:bg-blue-400/20';
      default:
        return 'border-orange-400 text-orange-400 bg-orange-400/10 hover:bg-orange-400/20';
    }
  };

  // Version mobile avec bouton de déconnexion visible
  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => signOut()}
          variant="ghost"
          size="sm"
          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} alt="Profile" />
                <AvatarFallback className="bg-[#FF6B9D]/20 text-[#FF6B9D]">
                  {profile?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile?.username || 'Utilisateur'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                <Badge 
                  variant="outline" 
                  className={getRoleBadgeClass(userRole)}
                >
                  {userRole}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Version desktop avec bouton de déconnexion ajouté
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => signOut()}
        variant="ghost"
        size="sm"
        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Se déconnecter
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} alt="Profile" />
              <AvatarFallback className="bg-[#FF6B9D]/20 text-[#FF6B9D]">
                {profile?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.username || 'Utilisateur'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
              <Badge 
                variant="outline" 
                className={getRoleBadgeClass(userRole)}
              >
                {userRole}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
