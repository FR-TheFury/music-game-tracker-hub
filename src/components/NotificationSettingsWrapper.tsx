
import React from 'react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';

export const NotificationSettingsWrapper: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="secondary-3d" 
          size="sm"
          className="rose-glow transform-none hover:transform-none"
        >
          <div className="p-1 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#FFB3CD] mr-2">
            <Bell className="h-3 w-3 text-white" />
          </div>
          Notifications
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl card-3d">
        <NotificationSettings />
      </DialogContent>
    </Dialog>
  );
};
