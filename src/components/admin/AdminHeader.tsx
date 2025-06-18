
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface AdminHeaderProps {
  user: User | null;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ user }) => {
  const navigate = useNavigate();

  return (
    <header className="bg-gradient-to-r from-[#FF0751]/20 to-slate-800/90 backdrop-blur-sm border-b border-[#FF0751]/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-[#FF0751]/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div className="p-2 rounded-full bg-gradient-to-r from-[#FF0751] to-[#FF3971] rose-glow">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent">
              Administration
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm">
              {user?.email}
            </span>
            <Badge variant="outline" className="border-[#FF0751] text-[#FF0751] bg-[#FF0751]/10 hover:bg-[#FF0751]/20 transition-all duration-300">
              Administrateur
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
};
