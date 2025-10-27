import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { Bell, Settings } from "lucide-react";

const Notifications = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Notificaciones</h1>
            <p className="text-muted-foreground">
              Gestiona tus notificaciones y preferencias
            </p>
          </div>

          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preferencias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <NotificationsList />
            </TabsContent>

            <TabsContent value="preferences">
              <NotificationPreferences />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Notifications;
