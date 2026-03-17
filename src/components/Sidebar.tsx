import { Home, Search, Map, Award, User, Plus, LogIn, LogOut, Menu, X, Building2, MoreHorizontal, BookOpen, Gamepad2, MessageCircle, Play, Radio, ChevronRight, Star, Trophy, PanelLeft, Languages, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo, useEffect } from "react";
import { AuthModal } from "./AuthModal";
import { SearchModal } from "./SearchModal";
import { MoreModal } from "./MoreModal";
import { useAuth } from "@/hooks/useAuth";
import { useInstitution } from "@/hooks/useInstitution";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import sedefyLogo from "@/assets/sedefy-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { myInstitution } = useInstitution();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [moreModalOpen, setMoreModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollDirection = useScrollDirection();

  // Debug log to verify institution data
  console.log("Sidebar - myInstitution:", myInstitution);

  // Routes where the menu should NOT hide on scroll (capsule viewing routes)
  const capsuleViewRoutes = ["/"];
  const shouldHideOnScroll = !capsuleViewRoutes.includes(location.pathname);
  const isMenuVisible = !shouldHideOnScroll || scrollDirection !== "down";

  // Sync header visibility to body attribute for CSS sticky offset
  useEffect(() => {
    document.body.setAttribute("data-header-hidden", (!isMenuVisible).toString());
  }, [isMenuVisible]);

  const handleCreateClick = useCallback(() => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate("/create");
  }, [user, navigate]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }, [searchQuery, navigate]);

  const handleAuthAction = useCallback(() => {
    if (user) {
      signOut();
    } else {
      setAuthModalOpen(true);
    }
  }, [user, signOut]);

  const menuItems = useMemo(() => [
    { id: "home", icon: Home, label: "Inicio", path: "/" },
    { id: "sedetok", icon: Play, label: "Sede tok", path: "/sedetok" },
    { id: "chat", icon: MessageCircle, label: "Chat", path: "/chat" },
    { id: "routes", icon: Map, label: "Rutas", path: "/learning-paths" },
    { id: "courses", icon: BookOpen, label: "Cursos", path: "/courses" },
    { id: "trivia", icon: Gamepad2, label: "Trivia Game", path: "/trivia-game" },
    { id: "live-games", icon: Radio, label: "Juegos en Vivo", path: "/live-games" },
    { id: "language-tutor", icon: Languages, label: "English Tutor", path: "/language-tutor" },
    { id: "study-plan", icon: GraduationCap, label: "Plan de Estudios", path: "/study-plan" },
    { id: "achievements", icon: Award, label: "Logros", path: "/achievements" },
    { id: "profile", icon: User, label: "Perfil", path: "/profile" },
  ], []);

  // Route to page name mapping for breadcrumb
  const currentPageName = useMemo(() => {
    const routeMap: Record<string, string> = {
      "/": "Inicio",
      "/sedetok": "Sede tok",
      "/chat": "Chat",
      "/search": "Explorar",
      "/learning-paths": "Rutas",
      "/courses": "Cursos",
      "/trivia-game": "Trivia",
      "/live-games": "En Vivo",
      "/achievements": "Logros",
      "/profile": "Perfil",
      "/create": "Crear",
      "/edit-profile": "Editar Perfil",
      "/notifications": "Notificaciones",
      "/sede-ai": "Sede AI",
      "/language-tutor": "English Tutor",
      "/study-plan": "Plan de Estudios",
      "/buy-educoins": "Educoins",
      "/about": "Acerca de",
      "/terms": "Términos",
      "/privacy": "Privacidad",
      "/institution-dashboard": "Institución",
      "/vocational-profile": "Vocacional",
      "/professional-profile": "Profesional",
      "/cv-variations": "CV",
      "/xp-history": "Historial XP",
      "/educoins-history": "Historial Educoins",
      "/creator-content": "Mi Contenido",
      "/creator-program": "Creadores",
      "/install": "Instalar",
    };
    const exactMatch = routeMap[location.pathname];
    if (exactMatch) return exactMatch;
    // Check prefix matches for dynamic routes
    if (location.pathname.startsWith("/learning-paths/")) return "Ruta";
    if (location.pathname.startsWith("/courses/")) return "Curso";
    if (location.pathname.startsWith("/live-games/")) return "En Vivo";
    if (location.pathname.startsWith("/quiz-evaluation")) return "Evaluación";
    if (location.pathname.startsWith("/game-evaluation")) return "Evaluación";
    if (location.pathname.startsWith("/profile/")) return "Perfil";
    return "Sedefy";
  }, [location.pathname]);

  // Fetch user XP and ranking for mobile header badge
  const { data: userStats } = useQuery({
    queryKey: ["mobile-header-stats", user?.id],
    queryFn: async () => {
      if (!user) return { xp: 0, rank: 0 };
      const { data: profile } = await supabase
        .from("profiles")
        .select("experience_points")
        .eq("id", user.id)
        .single();
      const xp = profile?.experience_points || 0;
      // Get ranking
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("experience_points", xp);
      return { xp, rank: (count || 0) + 1 };
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setIsOpen(false);
  }, [navigate]);

  const handleSearchClick = useCallback(() => {
    setSearchModalOpen(true);
  }, []);

  const SidebarContent = ({ isMinified = false }: { isMinified?: boolean }) => (
    <>
      {/* Logo */}
      <div className={`p-6 border-b border-border transition-all ${isMinified ? 'px-3' : ''}`}>
        {isMinified ? (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
        ) : (
          <img src={sedefyLogo} alt="Sedefy" className="h-8 w-auto" />
        )}
      </div>

      {/* Search Bar */}
      <div className={`p-4 border-b border-border transition-all ${isMinified ? 'px-3' : ''}`}>
        <div 
          className="relative cursor-pointer"
          onClick={handleSearchClick}
        >
          {isMinified ? (
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10"
            >
              <Search className="w-5 h-5" />
            </Button>
          ) : (
            <>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar contenido..."
                value=""
                readOnly
                className="pl-10 cursor-pointer"
              />
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto p-4 space-y-1 transition-all ${isMinified ? 'px-3' : ''}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center ${isMinified ? 'justify-center px-0' : 'gap-4 px-4'} py-2 rounded-lg transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground font-medium' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title={isMinified ? item.label : undefined}
            >
              <Icon className="w-6 h-6" />
              {!isMinified && <span className="text-base">{item.label}</span>}
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setMoreModalOpen(true)}
          className={`w-full flex items-center ${isMinified ? 'justify-center px-0' : 'gap-4 px-4'} py-2 rounded-lg transition-all text-muted-foreground hover:bg-muted hover:text-foreground`}
          title={isMinified ? "Más" : undefined}
        >
          <MoreHorizontal className="w-6 h-6" />
          {!isMinified && <span className="text-base">Más</span>}
        </button>

        {/* Institution Link - Only shown if user has an institution */}
        {user && myInstitution && (
          <button
            onClick={() => handleNavigate("/institution-dashboard")}
            className={`w-full flex items-center ${isMinified ? 'justify-center px-0' : 'gap-4 px-4'} py-2 rounded-lg transition-all ${
              location.pathname === "/institution-dashboard"
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            } mt-2`}
            title={isMinified ? myInstitution.name : undefined}
          >
            <Building2 className="w-6 h-6" />
            {!isMinified && (
              <span className="text-base truncate">{myInstitution.name}</span>
            )}
          </button>
        )}

      </nav>

      {/* Create Button - Always visible */}
      <div className={`p-4 border-t border-border transition-all ${isMinified ? 'px-3' : ''}`}>
        <Button
          onClick={handleCreateClick}
          variant="secondary"
          className={`w-full font-medium ${isMinified ? 'px-0' : 'py-6'}`}
          size={isMinified ? "icon" : "lg"}
          title={isMinified ? "Crear" : undefined}
        >
          <Plus className={`w-6 h-6 ${isMinified ? '' : 'mr-2'}`} />
          {!isMinified && "Crear"}
        </Button>

        {/* Auth Button - Only show Login when logged out */}
        {!user && (
          <Button
            onClick={handleAuthAction}
            variant="outline"
            className={`w-full mt-2 font-medium ${isMinified ? 'px-0' : ''}`}
            size={isMinified ? "icon" : "lg"}
            title={isMinified ? "Iniciar Sesión" : undefined}
          >
            <LogIn className={`w-5 h-5 ${isMinified ? '' : 'mr-2'}`} />
            {!isMinified && "Iniciar Sesión"}
          </Button>
        )}
      </div>

      {/* Footer */}
      {!isMinified && (
        <div className="p-4 border-t border-border">
          <nav className="space-y-2 text-xs text-muted-foreground">
            <button
              onClick={() => handleNavigate("/about")}
              className="block hover:text-foreground transition-colors"
            >
              Sobre Sedefy
            </button>
            <button
              onClick={() => handleNavigate("/creator-program")}
              className="block hover:text-foreground transition-colors"
            >
              Programa de creadores
            </button>
            <button
              onClick={() => handleNavigate("/terms")}
              className="block hover:text-foreground transition-colors"
            >
              Términos y condiciones
            </button>
            <button
              onClick={() => handleNavigate("/privacy")}
              className="block hover:text-foreground transition-colors"
            >
              Política de privacidad
            </button>
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">© 2025 Sedefy</p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-card border-r border-border flex-col z-[60] transition-[width] duration-300 ${
          searchModalOpen ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent isMinified={searchModalOpen} />
      </aside>

      {/* Mobile/Tablet Header Bar */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isMenuVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0 pointer-events-none"
      }`}>
        <div className="flex items-center justify-between px-3 py-2.5 bg-background/95 backdrop-blur-md border-b border-border">
          {/* Left: Sidebar toggle + Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors">
                  <PanelLeft className="w-5 h-5 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col overflow-y-auto">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="h-5 w-px bg-border flex-shrink-0" />

            <div className="flex items-center gap-1.5 min-w-0">
              <button onClick={() => navigate("/")} className="flex-shrink-0 p-0.5">
                <Home className="w-4.5 h-4.5 text-muted-foreground" />
              </button>
              {currentPageName !== "Inicio" && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{currentPageName}</span>
                </>
              )}
              {currentPageName === "Inicio" && (
                <span className="text-sm font-medium text-foreground">Inicio</span>
              )}
            </div>
          </div>

          {/* Right: XP + Ranking badge + Search */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && userStats && (
              <button
                onClick={() => navigate("/achievements")}
                className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5 border border-border/50"
              >
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">{userStats.xp}</span>
                <div className="h-3.5 w-px bg-border" />
                <Trophy className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-foreground">#{userStats.rank}</span>
              </button>
            )}
            <button
              onClick={handleSearchClick}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Search className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={() => navigate("/create")}
      />

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      <MoreModal
        open={moreModalOpen}
        onOpenChange={setMoreModalOpen}
      />
    </>
  );
};
