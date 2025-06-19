
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, UserSearch, Settings } from 'lucide-react';

export const Navigation: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const linkClass = (path: string) => 
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
      isActive(path)
        ? 'bg-[#FF0751]/20 text-[#FF0751] border border-[#FF0751]/30'
        : 'text-gray-300 hover:text-white hover:bg-slate-700/50'
    }`;

  return (
    <nav className="flex items-center gap-4">
      <Link to="/" className={linkClass('/')}>
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Accueil</span>
      </Link>
      
      <Link to="/friends-search" className={linkClass('/friends-search')}>
        <UserSearch className="h-4 w-4" />
        <span className="hidden sm:inline">Recherche d'amis</span>
      </Link>
      
      <Link to="/profile" className={linkClass('/profile')}>
        <Users className="h-4 w-4" />
        <span className="hidden sm:inline">Profil</span>
      </Link>
      
      <Link to="/settings" className={linkClass('/settings')}>
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Paramètres</span>
      </Link>
    </nav>
  );
};
