
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
          variant="primary-3d" 
          size="sm"
          className="rose-glow"
        >
          <Bell className="h-4 w-4 mr-2" />
          Notifications
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl card-3d">
        <NotificationSettings />
      </DialogContent>
    </Dialog>
  );
};
