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
import EducoinHistory from "./pages/EducoinHistory";
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
import BuyEducoins from "./pages/BuyEducoins";
import RegisterInstitution from "./pages/RegisterInstitution";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import CVVariations from "./pages/CVVariations";
import VocationalProfile from "./pages/VocationalProfile";
import QuizEvaluation from "./pages/QuizEvaluation";
import QuizEvaluations from "./pages/QuizEvaluations";
import CreateCourse from "./pages/CreateCourse";
import Courses from "./pages/Courses";
import ViewCourse from "./pages/ViewCourse";
import EditGame from "./pages/EditGame";

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
          <Route path="/educoin-history" element={<EducoinHistory />} />
          <Route path="/buy-educoins" element={<BuyEducoins />} />
          <Route path="/create" element={<CreateContent />} />
          <Route path="/edit/:id" element={<EditContent />} />
          <Route path="/games/edit/:id" element={<EditGame />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/profile/professional" element={<ProfessionalProfile />} />
          <Route path="/profile/professional/:userId" element={<ProfessionalProfile />} />
          <Route path="/profile/vocational" element={<VocationalProfile />} />
          <Route path="/profile/vocational/:userId" element={<VocationalProfile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/u/:userId" element={<ProfessionalProfile />} />
          <Route path="/cv-variations" element={<CVVariations />} />
          <Route path="/creator/:userId/content" element={<CreatorContent />} />
          <Route path="/learning-paths" element={<LearningPaths />} />
          <Route path="/learning-paths/create" element={<CreateLearningPath />} />
          <Route path="/learning-paths/edit/:id" element={<CreateLearningPath />} />
          <Route path="/learning-paths/view/:id" element={<ViewLearningPath />} />
          <Route path="/learning-paths/:id" element={<ViewLearningPath />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/create" element={<CreateCourse />} />
          <Route path="/courses/:id" element={<ViewCourse />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/register-institution" element={<RegisterInstitution />} />
          <Route path="/institution-dashboard" element={<InstitutionDashboard />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/about" element={<AboutSedefy />} />
          <Route path="/creator-program" element={<CreatorProgram />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/install" element={<Install />} />
          <Route path="/quiz-evaluation" element={<QuizEvaluation />} />
          <Route path="/quiz-evaluation/:accessCode" element={<QuizEvaluation />} />
          <Route path="/quiz-evaluations/:quizId" element={<QuizEvaluations />} />
          <Route path="/quiz-evaluations/results/:eventId" element={<QuizEvaluations />} />
          <Route path="/quiz-evaluations" element={<QuizEvaluations />} />
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
