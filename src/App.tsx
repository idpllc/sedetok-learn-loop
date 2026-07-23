import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OpenGraphHandler } from "@/components/OpenGraphHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Retry lazy imports once and force a reload if the chunk is stale (post-deploy).
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) {
        const key = "__chunk_reloaded__";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
          return new Promise(() => ({})) as any;
        }
      }
      throw err;
    }
  });

// Lazy-load all pages so each route only ships its own chunk.
const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const AutoLogin = lazyWithRetry(() => import("./pages/AutoLogin"));
const Search = lazyWithRetry(() => import("./pages/Search"));
const Achievements = lazyWithRetry(() => import("./pages/Achievements"));
const XPHistory = lazyWithRetry(() => import("./pages/XPHistory"));
const EducoinHistory = lazyWithRetry(() => import("./pages/EducoinHistory"));
const Notifications = lazyWithRetry(() => import("./pages/Notifications"));
const CreateContent = lazyWithRetry(() => import("./pages/CreateContent"));
const EditContent = lazyWithRetry(() => import("./pages/EditContent"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const EditProfile = lazyWithRetry(() => import("./pages/EditProfile"));
const ProfessionalProfile = lazyWithRetry(() => import("./pages/ProfessionalProfile"));
const LearningPaths = lazyWithRetry(() => import("./pages/LearningPaths"));
const SedeAI = lazyWithRetry(() => import("./pages/SedeAI"));
const CreateLearningPath = lazyWithRetry(() => import("./pages/CreateLearningPath"));
const ViewLearningPath = lazyWithRetry(() => import("./pages/ViewLearningPath"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const AboutSedefy = lazyWithRetry(() => import("./pages/AboutSedefy"));
const AboutUs = lazyWithRetry(() => import("./pages/AboutUs"));
const CreatorProgram = lazyWithRetry(() => import("./pages/CreatorProgram"));
const TermsAndConditions = lazyWithRetry(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const CreatorContent = lazyWithRetry(() => import("./pages/CreatorContent"));
const BuyEducoins = lazyWithRetry(() => import("./pages/BuyEducoins"));
const RegisterInstitution = lazyWithRetry(() => import("./pages/RegisterInstitution"));
const InstitutionDashboard = lazyWithRetry(() => import("./pages/InstitutionDashboard"));
const TeacherDashboard = lazyWithRetry(() => import("./pages/TeacherDashboard"));
const CVVariations = lazyWithRetry(() => import("./pages/CVVariations"));
const VocationalProfile = lazyWithRetry(() => import("./pages/VocationalProfile"));
const QuizEvaluation = lazyWithRetry(() => import("./pages/QuizEvaluation"));
const QuizEvaluations = lazyWithRetry(() => import("./pages/QuizEvaluations"));
const GameEvaluation = lazyWithRetry(() => import("./pages/GameEvaluation"));
const CreateCourse = lazyWithRetry(() => import("./pages/CreateCourse"));
const Courses = lazyWithRetry(() => import("./pages/Courses"));
const ViewCourse = lazyWithRetry(() => import("./pages/ViewCourse"));
const EditGame = lazyWithRetry(() => import("./pages/EditGame"));
const TriviaGame = lazyWithRetry(() => import("./pages/TriviaGame"));
const SedeTok = lazyWithRetry(() => import("./pages/SedeTok"));
const LiveGames = lazyWithRetry(() => import("./pages/LiveGames"));
const LiveGameHost = lazyWithRetry(() => import("./pages/LiveGameHost"));
const LiveGamePlay = lazyWithRetry(() => import("./pages/LiveGamePlay"));
const LiveGameResults = lazyWithRetry(() => import("./pages/LiveGameResults"));
const EditLiveGame = lazyWithRetry(() => import("./pages/EditLiveGame"));
const PathEvaluationResults = lazyWithRetry(() => import("./pages/PathEvaluationResults"));
const ApiDocumentation = lazyWithRetry(() => import("./pages/ApiDocumentation"));
const Chat = lazyWithRetry(() => import("./pages/Chat"));
const ChatLogin = lazyWithRetry(() => import("./pages/ChatLogin"));
const ChatLoginTest = lazyWithRetry(() => import("./pages/ChatLoginTest"));
const JoinGame = lazyWithRetry(() => import("./pages/JoinGame"));
const LanguageTutor = lazyWithRetry(() => import("./pages/LanguageTutor"));
const StudyPlan = lazyWithRetry(() => import("./pages/StudyPlan"));
const Notebook = lazyWithRetry(() => import("./pages/Notebook"));
const NotebookView = lazyWithRetry(() => import("./pages/NotebookView"));
const PresentationView = lazyWithRetry(() => import("./pages/PresentationView"));
const PresentationEdit = lazyWithRetry(() => import("./pages/PresentationEdit"));
const PublishingErrorDetails = lazyWithRetry(() => import("./pages/PublishingErrorDetails"));
const PaymentLink = lazyWithRetry(() => import("./pages/PaymentLink"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const Contacto = lazyWithRetry(() => import("./pages/Contacto"));
const InstitutionProfile = lazyWithRetry(() => import("./pages/InstitutionProfile"));
const Gobierno = lazyWithRetry(() => import("./pages/Gobierno"));
const Instituciones = lazyWithRetry(() => import("./pages/Instituciones"));

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
const NotebookPromoModal = lazy(() =>
  import("@/components/NotebookPromoModal").then((m) => ({ default: m.NotebookPromoModal }))
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
  const isDiagnosticRoute = location.pathname === "/admin/publishing-error";
  const isPaymentRoute = location.pathname.startsWith("/pay/") || location.pathname.startsWith("/payment");
  if (embed || isAuthRoute || isDiagnosticRoute || isPaymentRoute) return null;
  return (
    <Suspense fallback={null}>
      <FloatingTutorChat />
      <PWAInstallPrompt />
      <PWAOpenInAppBanner />
      <NotebookPromoModal />
    </Suspense>
  );
};

/**
 * Redirects root URLs with legacy ?quizId= or ?contentId= params to /sedetok.
 * Otherwise renders the normal home page.
 */
const IndexWithRedirect = () => {
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get("quizId");
  const contentId = searchParams.get("contentId");
  const gameId = searchParams.get("gameId");
  const pathId = searchParams.get("path");
  if (pathId) {
    return <Navigate to={`/learning-paths/view/${pathId}`} replace />;
  }
  if (quizId || contentId || gameId) {
    const target = new URLSearchParams();
    if (contentId) target.set("content", contentId);
    if (quizId) target.set("quiz", quizId);
    if (gameId) target.set("game", gameId);
    return <Navigate to={`/sedetok?${target.toString()}`} replace />;
  }

  return <Index />;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OpenGraphHandler />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<IndexWithRedirect />} />
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
            <Route path="/pricing" element={<Pricing />} />
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
            <Route path="/pay/:subscriptionId" element={<PaymentLink />} />
            <Route path="/admin/publishing-error" element={<PublishingErrorDetails />} />
            <Route path="/register-institution" element={<RegisterInstitution />} />
            <Route path="/institution-dashboard" element={<InstitutionDashboard />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/about" element={<AboutSedefy />} />
            <Route path="/about-us" element={<AboutUs />} />
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
            <Route path="/presentation/:id" element={<PresentationView />} />
            <Route path="/presentation/:id/edit" element={<PresentationEdit />} />
            <Route path="/api-docs" element={<ApiDocumentation />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/login" element={<ChatLogin />} />
            <Route path="/chat/login-test" element={<ChatLoginTest />} />
            <Route path="/gobierno" element={<Gobierno />} />
            {/* Institution custom slug — MUST be the last named route before catch-all */}
            <Route
              path="/:slug"
              element={
                <ErrorBoundary fallback={<NotFound />}>
                  <InstitutionProfile />
                </ErrorBoundary>
              }
            />
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
