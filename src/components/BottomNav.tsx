import { Home, Search, Award, User } from "lucide-react";
import { useState } from "react";

export const BottomNav = () => {
  const [activeTab, setActiveTab] = useState("home");

  const tabs = [
    { id: "home", icon: Home, label: "Inicio" },
    { id: "search", icon: Search, label: "Explorar" },
    { id: "achievements", icon: Award, label: "Logros" },
    { id: "profile", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-6 h-6 transition-all ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
