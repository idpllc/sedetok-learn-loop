import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar, Search, ExternalLink, Gamepad2, Brain, Globe } from "lucide-react";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { useQuizzes } from "@/hooks/useQuizzes";
import { useGames } from "@/hooks/useGames";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIMEZONES = [
  { value: "America/Bogota", label: "Bogotá, Colombia (UTC-5)" },
  { value: "America/Mexico_City", label: "Ciudad de México (UTC-6)" },
  { value: "America/Lima", label: "Lima, Perú (UTC-5)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires, Argentina (UTC-3)" },
  { value: "America/Santiago", label: "Santiago, Chile (UTC-3)" },
  { value: "America/Caracas", label: "Caracas, Venezuela (UTC-4)" },
  { value: "America/New_York", label: "Nueva York (UTC-5)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (UTC-8)" },
  { value: "Europe/Madrid", label: "Madrid, España (UTC+1)" },
  { value: "UTC", label: "UTC" },
];

// Get timezone offset in minutes for a given IANA timezone
const getTimezoneOffset = (timezone: string, date: Date): number => {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
};

// Convert local datetime string to ISO with timezone consideration
const toISOWithTimezone = (dateTimeLocal: string, timezone: string): string => {
  const [datePart, timePart] = dateTimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a date in UTC that represents the given time in the target timezone
  const tempDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const offsetMinutes = getTimezoneOffset(timezone, tempDate);
  
  // Adjust for the timezone offset
  const adjustedDate = new Date(tempDate.getTime() + offsetMinutes * 60000);
  return adjustedDate.toISOString();
};

interface CreateUnifiedEvaluationEventProps {
  quizId?: string;
  gameId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateUnifiedEvaluationEvent = ({ quizId, gameId, open, onOpenChange }: CreateUnifiedEvaluationEventProps) => {
  const { createEvent } = useEvaluationEvents();
  const { quizzes, isLoading: loadingQuizzes } = useQuizzes();
  const [games, setGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [selectedType, setSelectedType] = useState<"quiz" | "game">(quizId ? "quiz" : gameId ? "game" : "quiz");
  const [selectedQuizId, setSelectedQuizId] = useState(quizId || "");
  const [selectedGameId, setSelectedGameId] = useState(gameId || "");
  const [openCombobox, setOpenCombobox] = useState(false);
  const [timezone, setTimezone] = useState("America/Bogota");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    require_authentication: true,
    allow_multiple_attempts: false,
    show_results_immediately: true,
  });

  useEffect(() => {
    if (quizId) {
      setSelectedQuizId(quizId);
      setSelectedType("quiz");
    }
    if (gameId) {
      setSelectedGameId(gameId);
      setSelectedType("game");
    }
  }, [quizId, gameId]);

  useEffect(() => {
    const fetchGames = async () => {
      setLoadingGames(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("creator_id", userData.user.id)
        .order("created_at", { ascending: false });
      
      setGames(data || []);
      setLoadingGames(false);
    };
    
    if (open) {
      fetchGames();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.start_date || !formData.end_date) {
      return;
    }

    if (selectedType === "quiz" && !selectedQuizId) {
      return;
    }

    if (selectedType === "game" && !selectedGameId) {
      return;
    }

    const startDate = toISOWithTimezone(formData.start_date, timezone);
    const endDate = toISOWithTimezone(formData.end_date, timezone);

    createEvent.mutate({
      quiz_id: selectedType === "quiz" ? selectedQuizId : undefined,
      game_id: selectedType === "game" ? selectedGameId : undefined,
      ...formData,
      start_date: startDate,
      end_date: endDate,
    });

    onOpenChange(false);
    setSelectedQuizId(quizId || "");
    setSelectedGameId(gameId || "");
    setTimezone("America/Bogota");
    setFormData({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      require_authentication: true,
      allow_multiple_attempts: false,
      show_results_immediately: true,
    });
  };

  const selectedQuiz = quizzes?.find(q => q.id === selectedQuizId);
  const selectedGame = games?.find(g => g.id === selectedGameId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Evento de Evaluación</DialogTitle>
          <DialogDescription>
            Crea un evento para que otros usuarios puedan realizar este contenido en un período específico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!quizId && !gameId && (
            <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as "quiz" | "game")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quiz">
                  <Brain className="h-4 w-4 mr-2" />
                  Quiz
                </TabsTrigger>
                <TabsTrigger value="game">
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  Juego
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quiz" className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Quiz a Evaluar *</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => window.open('/create?type=quiz', '_blank')}
                    className="h-auto p-0"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Crear nuevo quiz
                  </Button>
                </div>
                <Popover open={openCombobox && selectedType === "quiz"} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full justify-between"
                    >
                      {selectedQuiz ? selectedQuiz.title : "Selecciona un quiz..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar quiz..." />
                      <CommandEmpty>
                        {loadingQuizzes ? "Cargando..." : "No se encontró ningún quiz"}
                      </CommandEmpty>
                      <CommandGroup>
                        {quizzes?.map((quiz) => (
                          <CommandItem
                            key={quiz.id}
                            onSelect={() => {
                              setSelectedQuizId(quiz.id);
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedQuizId === quiz.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {quiz.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TabsContent>

              <TabsContent value="game" className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Juego a Evaluar *</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => window.open('/create?type=game', '_blank')}
                    className="h-auto p-0"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Crear nuevo juego
                  </Button>
                </div>
                <Popover open={openCombobox && selectedType === "game"} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full justify-between"
                    >
                      {selectedGame ? selectedGame.title : "Selecciona un juego..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar juego..." />
                      <CommandEmpty>
                        {loadingGames ? "Cargando..." : "No se encontró ningún juego"}
                      </CommandEmpty>
                      <CommandGroup>
                        {games?.map((game) => (
                          <CommandItem
                            key={game.id}
                            onSelect={() => {
                              setSelectedGameId(game.id);
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedGameId === game.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {game.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TabsContent>
            </Tabs>
          )}

          {(quizId || gameId) && (
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{selectedType === "quiz" ? "Quiz" : "Juego"} seleccionado:</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      if (selectedType === "quiz") setSelectedQuizId("");
                      else setSelectedGameId("");
                    }}
                    className="h-auto p-0"
                  >
                    Cambiar
                  </Button>
                </div>
                <p className="text-sm">{selectedType === "quiz" ? selectedQuiz?.title : selectedGame?.title}</p>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="title">Título del Evento *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Evaluación Final - Matemáticas"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el propósito de esta evaluación..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Zona Horaria
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona zona horaria" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Inicio *
                </Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Finalización *
                </Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium text-sm">Configuración</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require_auth">Requiere autenticación</Label>
                <p className="text-xs text-muted-foreground">
                  Los usuarios deben iniciar sesión para participar
                </p>
              </div>
              <Switch
                id="require_auth"
                checked={formData.require_authentication}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, require_authentication: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow_multiple">Permitir múltiples intentos</Label>
                <p className="text-xs text-muted-foreground">
                  Los usuarios pueden intentar más de una vez
                </p>
              </div>
              <Switch
                id="allow_multiple"
                checked={formData.allow_multiple_attempts}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_multiple_attempts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show_results">Mostrar resultados inmediatamente</Label>
                <p className="text-xs text-muted-foreground">
                  Los usuarios verán su calificación al terminar
                </p>
              </div>
              <Switch
                id="show_results"
                checked={formData.show_results_immediately}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, show_results_immediately: checked })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? "Creando..." : "Crear Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
