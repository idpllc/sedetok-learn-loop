import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNotebookTrivia, TriviaPlayer } from "@/hooks/useNotebookTrivia";
import { Loader2, Users, Play as PlayIcon, Crown, Sparkles, Trophy, Check, X, Clock, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: string;
}

const QUESTION_TIME = 15000;
const REVEAL_TIME = 3500;

const PlayerChip = ({ p, isHost, isMe }: { p: TriviaPlayer; isHost: boolean; isMe: boolean }) => (
  <div className={cn("flex items-center gap-2 rounded-full border px-2 py-1 text-xs bg-card", isMe && "border-primary ring-1 ring-primary")}>
    <Avatar className="h-5 w-5">
      <AvatarImage src={p.avatar_url || undefined} />
      <AvatarFallback>{(p.display_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
    <span className="truncate max-w-[100px]">{p.display_name || "Estudiante"}</span>
    {isHost && <Crown className="h-3 w-3 text-amber-500" />}
  </div>
);

export const NotebookTriviaModal = ({ open, onOpenChange, notebookId }: Props) => {
  const { user } = useAuth();
  const { resolving, topic, room, players, questions, start, leave, startGame, nextQuestion, submitAnswer } = useNotebookTrivia(notebookId);

  // Auto-start resolve on open
  useEffect(() => {
    if (open && !room && !resolving) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isHost = !!user && room?.host_user_id === user.id;

  const handleClose = async () => {
    if (room && room.status !== "finished") await leave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-2xl p-0 z-[100]">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-pink" /> Trivia del tema
            {topic && <span className="text-xs text-muted-foreground font-normal truncate ml-2">· {topic.title}</span>}
          </DialogTitle>
        </DialogHeader>

        {!room && (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-pink mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {resolving ? "Analizando el tema y generando preguntas con IA…" : "Preparando trivia…"}
            </p>
          </div>
        )}

        {room && room.status === "waiting" && (
          <Lobby
            room={room}
            players={players}
            isHost={isHost}
            userId={user?.id}
            topicTitle={topic?.title || ""}
            topicSubject={topic?.subject || ""}
            onStart={startGame}
            onLeave={handleClose}
          />
        )}

        {room && room.status === "in_progress" && (
          <Play
            room={room}
            players={players}
            questions={questions}
            isHost={isHost}
            userId={user?.id}
            onSubmit={submitAnswer}
            onAdvance={nextQuestion}
          />
        )}

        {room && room.status === "finished" && (
          <Results players={players} userId={user?.id} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
};

// =================== LOBBY ===================
function Lobby({
  room, players, isHost, userId, topicTitle, topicSubject, onStart, onLeave,
}: {
  room: any; players: TriviaPlayer[]; isHost: boolean; userId?: string;
  topicTitle: string; topicSubject: string;
  onStart: () => void; onLeave: () => void;
}) {
  return (
    <div className="p-5">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground">{topicSubject}</p>
        <h2 className="text-xl font-bold">{topicTitle}</h2>
        <p className="text-xs text-muted-foreground mt-1">20 preguntas · hasta 30 jugadores</p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold flex items-center gap-1">
            <Users className="h-4 w-4" /> Jugadores ({players.length}/{room.max_players})
          </span>
          <span className="text-[11px] text-muted-foreground">Esperando inicio…</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <PlayerChip key={p.id} p={p} isHost={p.user_id === room.host_user_id} isMe={p.user_id === userId} />
          ))}
          {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-muted/40 border border-dashed" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onLeave}>
          <LogOut className="h-3.5 w-3.5 mr-1" /> Salir
        </Button>
        {isHost ? (
          <Button onClick={onStart} className="bg-pink hover:bg-pink/90 text-white" disabled={players.length < 1}>
            <Play className="h-4 w-4 mr-1" /> Iniciar trivia
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">El anfitrión iniciará la partida</p>
        )}
      </div>
    </div>
  );
}

// =================== PLAY ===================
function Play({
  room, players, questions, isHost, userId, onSubmit, onAdvance,
}: {
  room: any; players: TriviaPlayer[]; questions: any[]; isHost: boolean; userId?: string;
  onSubmit: (position: number, idx: number, timeMs: number) => Promise<any>;
  onAdvance: () => void;
}) {
  const position = room.current_question;
  const question = useMemo(() => questions.find((q) => q.position === position), [questions, position]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<{ correctIndex?: number; isCorrect?: boolean; points?: number } | null>(null);
  const [remaining, setRemaining] = useState(QUESTION_TIME);
  const startedRef = useRef<number>(Date.now());
  const advancedRef = useRef(false);

  // Reset on new question
  useEffect(() => {
    setSelected(null);
    setRevealed(null);
    startedRef.current = room.question_started_at ? new Date(room.question_started_at).getTime() : Date.now();
    advancedRef.current = false;
  }, [position, room.question_started_at]);

  // Countdown
  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = Date.now() - startedRef.current;
      const r = Math.max(0, QUESTION_TIME - elapsed);
      setRemaining(r);
      if (r === 0 && selected === null && !revealed) {
        // Auto-submit no answer
        void handlePick(-1);
      }
      // After question time + reveal, host advances
      if (isHost && elapsed >= QUESTION_TIME + REVEAL_TIME && !advancedRef.current) {
        advancedRef.current = true;
        onAdvance();
      }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, selected, revealed, isHost]);

  const handlePick = async (idx: number) => {
    if (selected !== null || !question) return;
    setSelected(idx);
    const elapsed = Date.now() - startedRef.current;
    const res = await onSubmit(position, idx, elapsed);
    setRevealed({
      correctIndex: res?.correctIndex,
      isCorrect: !!res?.isCorrect,
      points: res?.points || 0,
    });
  };

  const sorted = [...players].sort((a, b) => b.score - a.score);

  if (!question) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-pink mx-auto" />
      </div>
    );
  }

  const optionColors = [
    "bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20",
    "bg-sky-500/10 border-sky-500/40 hover:bg-sky-500/20",
    "bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20",
    "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20",
  ];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>Pregunta {position}/20</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {Math.ceil(remaining / 1000)}s
        </span>
      </div>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-pink transition-all"
          style={{ width: `${(remaining / QUESTION_TIME) * 100}%` }}
        />
      </div>

      <h3 className="text-base font-semibold mb-4 leading-snug">{question.question}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(question.options || []).map((opt: string, i: number) => {
          const isSel = selected === i;
          const isCorrect = revealed?.correctIndex === i;
          const isWrong = revealed && isSel && !isCorrect;
          return (
            <button
              key={i}
              onClick={() => handlePick(i)}
              disabled={selected !== null || revealed !== null}
              className={cn(
                "rounded-lg border p-3 text-sm text-left transition disabled:opacity-90",
                optionColors[i],
                isSel && !revealed && "ring-2 ring-primary",
                revealed && isCorrect && "ring-2 ring-emerald-500 bg-emerald-500/30",
                isWrong && "ring-2 ring-rose-500 bg-rose-500/30"
              )}
            >
              <div className="flex items-start gap-2">
                <span className="font-bold opacity-70">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1">{opt}</span>
                {revealed && isCorrect && <Check className="h-4 w-4 text-emerald-600" />}
                {isWrong && <X className="h-4 w-4 text-rose-600" />}
              </div>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-3 text-center text-sm">
          {revealed.isCorrect ? (
            <span className="text-emerald-600 font-semibold">¡Correcto! +{revealed.points} pts</span>
          ) : (
            <span className="text-rose-600 font-semibold">{selected === -1 ? "Tiempo agotado" : "Incorrecto"}</span>
          )}
        </div>
      )}

      {/* Live scoreboard */}
      <div className="mt-5 pt-3 border-t">
        <p className="text-[11px] text-muted-foreground mb-2">Marcador en vivo</p>
        <div className="flex flex-wrap gap-2">
          {sorted.slice(0, 8).map((p, i) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2 py-1 text-xs",
                p.user_id === userId && "border-primary bg-primary/10"
              )}
            >
              <span className="font-bold opacity-60">#{i + 1}</span>
              <Avatar className="h-5 w-5">
                <AvatarImage src={p.avatar_url || undefined} />
                <AvatarFallback>{(p.display_name || "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[80px]">{p.display_name}</span>
              <span className="font-bold text-pink">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =================== RESULTS ===================
function Results({ players, userId, onClose }: { players: TriviaPlayer[]; userId?: string; onClose: () => void }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const me = sorted.find((p) => p.user_id === userId);
  const myRank = me ? sorted.findIndex((p) => p.user_id === userId) + 1 : null;
  const won = myRank === 1 && (me?.score || 0) > 0;

  return (
    <div className="p-6 text-center">
      <Trophy className={cn("h-12 w-12 mx-auto mb-3", won ? "text-amber-500" : "text-muted-foreground")} />
      <h2 className="text-xl font-bold">{won ? "¡Ganaste!" : "Trivia terminada"}</h2>
      {me && (
        <p className="text-sm text-muted-foreground mt-1">
          Quedaste #{myRank} con {me.score} puntos · {me.correct_count}/20 correctas
        </p>
      )}

      <div className="mt-5 max-h-72 overflow-y-auto space-y-2 text-left">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-2",
              p.user_id === userId && "border-primary bg-primary/5",
              i === 0 && (p.score || 0) > 0 && "border-amber-500/60 bg-amber-500/10"
            )}
          >
            <span className="w-6 text-center font-bold text-muted-foreground">#{i + 1}</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback>{(p.display_name || "?").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.display_name}</p>
              <p className="text-[11px] text-muted-foreground">{p.correct_count} correctas</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-pink">{p.score}</p>
              <p className="text-[10px] text-muted-foreground">pts</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onClose} className="mt-5 bg-pink hover:bg-pink/90 text-white">
        Volver al cuaderno
      </Button>
    </div>
  );
}
