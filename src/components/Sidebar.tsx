import { Home, Search, Map, Award, User, Plus, LogIn, LogOut, Menu, X, Building2, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { AuthModal } from "./AuthModal";
import { SearchModal } from "./SearchModal";
import { MoreModal } from "./MoreModal";
import { useAuth } from "@/hooks/useAuth";
import { useInstitution } from "@/hooks/useInstitution";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import sedefyLogo from "@/assets/sedefy-logo.png";
import { useScrollDirection } from "@/hooks/useScrollDirection";

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
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
    { id: "search", icon: Search, label: "Explorar", path: "/search" },
    { id: "achievements", icon: Award, label: "Logros", path: "/achievements" },
    { id: "profile", icon: User, label: "Perfil", path: "/profile" },
  ], []);

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
      <nav className={`flex-1 p-4 space-y-1 transition-all ${isMinified ? 'px-3' : ''}`}>
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

        {/* Create Button */}
        <Button
          onClick={handleCreateClick}
          variant="secondary"
          className={`w-full mt-4 font-medium ${isMinified ? 'px-0' : 'py-6'}`}
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
      </nav>

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
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-card border-r border-border flex-col z-50 transition-all duration-300 ${
          searchModalOpen ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent isMinified={searchModalOpen} />
      </aside>

      {/* Mobile/Tablet Hamburger Menu and Quick Links */}
      <div className={`md:hidden fixed top-4 left-4 z-50 flex items-center gap-3 transition-all duration-300 ${
        isMenuVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0 pointer-events-none"
      }`}>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="w-10 h-10 rounded-full shadow-lg bg-black/60 backdrop-blur-sm hover:bg-black/80"
            >
              <Menu className="w-5 h-5 text-white" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
            <SidebarContent />
          </SheetContent>
        </Sheet>

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
