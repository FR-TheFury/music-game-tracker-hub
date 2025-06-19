
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, User, Search, Shield, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRoleContext } from '@/contexts/UserRoleContext';

export const MobileMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { userRole } = useUserRoleContext();

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-[#FF0751]/20"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-slate-900 border-slate-700">
        <SheetHeader>
          <SheetTitle className="text-white text-left">Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          <Button
            onClick={() => handleNavigation('/complete-profile')}
            variant="ghost"
            className="justify-start text-white hover:bg-[#FF0751]/20"
          >
            <User className="h-4 w-4 mr-3" />
            Mon Profil
          </Button>
          
          <Button
            onClick={() => handleNavigation('/friends')}
            variant="ghost"
            className="justify-start text-white hover:bg-[#FF0751]/20"
          >
            <Search className="h-4 w-4 mr-3" />
            Rechercher des amis
          </Button>
          
          {userRole === 'admin' && (
            <Button
              onClick={() => handleNavigation('/admin')}
              variant="ghost"
              className="justify-start text-white hover:bg-[#FF0751]/20"
            >
              <Shield className="h-4 w-4 mr-3" />
              Administration
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
