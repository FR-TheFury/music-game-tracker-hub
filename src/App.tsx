
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/AuthPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ArtistDetail from "./pages/ArtistDetail";
import GameDetail from "./pages/GameDetail";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import UserProfilePage from "./pages/UserProfilePage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import FriendsSearch from "./pages/FriendsSearch";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#FF0751] to-slate-900 flex items-center justify-center">
      <div className="text-white">Chargement...</div>
    </div>;
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/artist/:id" element={<ArtistDetail />} />
        <Route path="/game/:id" element={<GameDetail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/notifications" element={<NotificationSettingsPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/friends" element={<FriendsSearch />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserRoleProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </UserRoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
