import { Home, Search, Map, Award, User, Plus, LogIn, LogOut, Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import sedefyLogo from "@/assets/sedefy-logo.png";

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate("/create");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      setAuthModalOpen(true);
    }
  };

  const menuItems = [
    { id: "home", icon: Home, label: "Inicio", path: "/" },
    { id: "search", icon: Search, label: "Explorar", path: "/search" },
    { id: "routes", icon: Map, label: "Rutas", path: "/learning-paths" },
    { id: "achievements", icon: Award, label: "Logros", path: "/achievements" },
    { id: "profile", icon: User, label: "Perfil", path: "/profile" },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <img src={sedefyLogo} alt="Sedefy" className="h-8 w-auto" />
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-border">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar contenido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground font-medium' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-base">{item.label}</span>
            </button>
          );
        })}

        {/* Create Button - Secondary variant */}
        <Button
          onClick={handleCreateClick}
          variant="secondary"
          className="w-full mt-4 font-medium py-6"
          size="lg"
        >
          <Plus className="w-6 h-6 mr-2" />
          Crear
        </Button>

        {/* Auth Button */}
        <Button
          onClick={handleAuthAction}
          variant={user ? "ghost" : "outline"}
          className="w-full mt-2 font-medium"
          size="lg"
        >
          {user ? (
            <>
              <LogOut className="w-5 h-5 mr-2" />
              Cerrar Sesión
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5 mr-2" />
              Iniciar Sesión
            </>
          )}
        </Button>
      </nav>

      {/* Footer */}
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col z-50">
        <SidebarContent />
      </aside>

      {/* Mobile/Tablet Hamburger Menu */}
      <div className="md:hidden fixed top-4 left-4 z-50">
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
    </>
  );
};
