import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OpenGraphHandler } from "@/components/OpenGraphHandler";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import Achievements from "./pages/Achievements";
import XPHistory from "./pages/XPHistory";
import CreateContent from "./pages/CreateContent";
import EditContent from "./pages/EditContent";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import LearningPaths from "./pages/LearningPaths";
import CreateLearningPath from "./pages/CreateLearningPath";
import ViewLearningPath from "./pages/ViewLearningPath";
import AdminDashboard from "./pages/AdminDashboard";
import AboutSedefy from "./pages/AboutSedefy";
import CreatorProgram from "./pages/CreatorProgram";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import CreatorContent from "./pages/CreatorContent";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OpenGraphHandler />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/search" element={<Search />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/xp-history" element={<XPHistory />} />
          <Route path="/create" element={<CreateContent />} />
          <Route path="/edit/:id" element={<EditContent />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/profile/professional" element={<ProfessionalProfile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/creator/:userId/content" element={<CreatorContent />} />
          <Route path="/learning-paths" element={<LearningPaths />} />
          <Route path="/learning-paths/create" element={<CreateLearningPath />} />
          <Route path="/learning-paths/edit/:id" element={<CreateLearningPath />} />
          <Route path="/learning-paths/view/:id" element={<ViewLearningPath />} />
          <Route path="/learning-paths/:id" element={<ViewLearningPath />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/about" element={<AboutSedefy />} />
          <Route path="/creator-program" element={<CreatorProgram />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/install" element={<Install />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
