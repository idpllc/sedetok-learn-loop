import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OpenGraphHandler } from "@/components/OpenGraphHandler";

// Lazy-load all pages so each route only ships its own chunk.
// This drastically reduces initial bundle size — critical for the
// notebook capsule iframe which mounts the app fresh on every open.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AutoLogin = lazy(() => import("./pages/AutoLogin"));
const Search = lazy(() => import("./pages/Search"));
const Achievements = lazy(() => import("./pages/Achievements"));
const XPHistory = lazy(() => import("./pages/XPHistory"));
const EducoinHistory = lazy(() => import("./pages/EducoinHistory"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CreateContent = lazy(() => import("./pages/CreateContent"));
const EditContent = lazy(() => import("./pages/EditContent"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ProfessionalProfile = lazy(() => import("./pages/ProfessionalProfile"));
const LearningPaths = lazy(() => import("./pages/LearningPaths"));
const SedeAI = lazy(() => import("./pages/SedeAI"));
const CreateLearningPath = lazy(() => import("./pages/CreateLearningPath"));
const ViewLearningPath = lazy(() => import("./pages/ViewLearningPath"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AboutSedefy = lazy(() => import("./pages/AboutSedefy"));
const CreatorProgram = lazy(() => import("./pages/CreatorProgram"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreatorContent = lazy(() => import("./pages/CreatorContent"));
const BuyEducoins = lazy(() => import("./pages/BuyEducoins"));
const RegisterInstitution = lazy(() => import("./pages/RegisterInstitution"));
const InstitutionDashboard = lazy(() => import("./pages/InstitutionDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const CVVariations = lazy(() => import("./pages/CVVariations"));
const VocationalProfile = lazy(() => import("./pages/VocationalProfile"));
const QuizEvaluation = lazy(() => import("./pages/QuizEvaluation"));
const QuizEvaluations = lazy(() => import("./pages/QuizEvaluations"));
const GameEvaluation = lazy(() => import("./pages/GameEvaluation"));
const CreateCourse = lazy(() => import("./pages/CreateCourse"));
const Courses = lazy(() => import("./pages/Courses"));
const ViewCourse = lazy(() => import("./pages/ViewCourse"));
const EditGame = lazy(() => import("./pages/EditGame"));
const TriviaGame = lazy(() => import("./pages/TriviaGame"));
const SedeTok = lazy(() => import("./pages/SedeTok"));
const LiveGames = lazy(() => import("./pages/LiveGames"));
const LiveGameHost = lazy(() => import("./pages/LiveGameHost"));
const LiveGamePlay = lazy(() => import("./pages/LiveGamePlay"));
const LiveGameResults = lazy(() => import("./pages/LiveGameResults"));
const EditLiveGame = lazy(() => import("./pages/EditLiveGame"));
const PathEvaluationResults = lazy(() => import("./pages/PathEvaluationResults"));
const ApiDocumentation = lazy(() => import("./pages/ApiDocumentation"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatLogin = lazy(() => import("./pages/ChatLogin"));
const ChatLoginTest = lazy(() => import("./pages/ChatLoginTest"));
const JoinGame = lazy(() => import("./pages/JoinGame"));
const LanguageTutor = lazy(() => import("./pages/LanguageTutor"));
const StudyPlan = lazy(() => import("./pages/StudyPlan"));
const Notebook = lazy(() => import("./pages/Notebook"));
const NotebookView = lazy(() => import("./pages/NotebookView"));

// Heavy non-essential UI is lazy too, and skipped entirely in embed mode
// (iframes used by the notebook capsule preview) to minimise boot time.
const FloatingTutorChat = lazy(() =>
  import("@/components/FloatingTutorChat").then((m) => ({ default: m.FloatingTutorChat }))
);
const PWAInstallPrompt = lazy(() =>
  import("@/components/PWAInstallPrompt").then((m) => ({ default: m.PWAInstallPrompt }))
);
const PWAOpenInAppBanner = lazy(() =>
  import("@/components/PWAOpenInAppBanner").then((m) => ({ default: m.PWAOpenInAppBanner }))
);

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

/**
 * Renders global chrome (tutor chat, PWA banners) only when NOT in embed mode.
 * Embed mode is signalled by `?embed=1` and is used by the notebook capsule
 * preview iframe to keep the boot path minimal.
 */
const GlobalChrome = () => {
  const location = useLocation();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  // Auth-related routes also don't need the floating tutor / PWA prompts.
  const isAuthRoute = ["/auth", "/auto-login", "/reset-password", "/chat/login", "/chat/login-test"].some(
    (p) => location.pathname.startsWith(p)
  );
  if (embed || isAuthRoute) return null;
  return (
    <Suspense fallback={null}>
      <FloatingTutorChat />
      <PWAInstallPrompt />
      <PWAOpenInAppBanner />
    </Suspense>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OpenGraphHandler />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sedetok" element={<SedeTok />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auto-login" element={<AutoLogin />} />
            <Route path="/search" element={<Search />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/xp-history" element={<XPHistory />} />
            <Route path="/educoin-history" element={<EducoinHistory />} />
            <Route path="/notifications" element={<Notifications />} />
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
            <Route path="/game-evaluation" element={<GameEvaluation />} />
            <Route path="/game-evaluation/:accessCode" element={<GameEvaluation />} />
            <Route path="/quiz-evaluations/:quizId" element={<QuizEvaluations />} />
            <Route path="/quiz-evaluations/results/:eventId" element={<QuizEvaluations />} />
            <Route path="/quiz-evaluations" element={<QuizEvaluations />} />
            <Route path="/game-evaluations/:gameId" element={<QuizEvaluations />} />
            <Route path="/game-evaluations/results/:eventId" element={<QuizEvaluations />} />
            <Route path="/game-evaluations" element={<QuizEvaluations />} />
            <Route path="/trivia-game" element={<TriviaGame />} />
            <Route path="/sede-ai" element={<SedeAI />} />
            <Route path="/language-tutor" element={<LanguageTutor />} />
            <Route path="/live-games" element={<LiveGames />} />
            <Route path="/live-games/edit/:gameId" element={<EditLiveGame />} />
            <Route path="/live-games/host/:gameId" element={<LiveGameHost />} />
            <Route path="/live-games/play/:gameId" element={<LiveGamePlay />} />
            <Route path="/live-games/results/:gameId" element={<LiveGameResults />} />
            <Route path="/join" element={<JoinGame />} />
            <Route path="/join/:pin" element={<JoinGame />} />
            <Route path="/path-evaluation-results/:eventId" element={<PathEvaluationResults />} />
            <Route path="/study-plan" element={<StudyPlan />} />
            <Route path="/notebook" element={<Notebook />} />
            <Route path="/notebook/:id" element={<NotebookView />} />
            <Route path="/api-docs" element={<ApiDocumentation />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/login" element={<ChatLogin />} />
            <Route path="/chat/login-test" element={<ChatLoginTest />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
        <Sonner />
        <GlobalChrome />
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
