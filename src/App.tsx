import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useEffect, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import Achievements from "./pages/Achievements";
import CreateContent from "./pages/CreateContent";
import EditContent from "./pages/EditContent";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import LearningPaths from "./pages/LearningPaths";
import CreateLearningPath from "./pages/CreateLearningPath";
import ViewLearningPath from "./pages/ViewLearningPath";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ClientOnly>
          <Toaster />
          <Sonner />
        </ClientOnly>
        <PWAInstallPrompt />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/search" element={<Search />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/create" element={<CreateContent />} />
          <Route path="/edit/:id" element={<EditContent />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/learning-paths" element={<LearningPaths />} />
          <Route path="/learning-paths/create" element={<CreateLearningPath />} />
          <Route path="/learning-paths/edit/:id" element={<CreateLearningPath />} />
          <Route path="/learning-paths/view/:id" element={<ViewLearningPath />} />
          <Route path="/learning-paths/:id" element={<ViewLearningPath />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
