
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { UserProfile } from '@/components/UserProfile';
import { RoleGuard } from '@/components/RoleGuard';

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <RoleGuard>
      <div className="min-h-screen bg-3d-main">
        <header className="header-3d">
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
                  <User className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF0751] to-[#FF6B9D] bg-clip-text text-transparent">
                  Mon Profil
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UserProfile />
        </main>
      </div>
    </RoleGuard>
  );
};

export default UserProfilePage;
