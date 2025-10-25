import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface WheelQuestion {
  question_text: string;
  correct_sentence: string;
  initial_letter: string;
  points: number;
  order_index: number;
}

interface WordWheelQuestionsEditorProps {
  questions: WheelQuestion[];
  onChange: (questions: WheelQuestion[]) => void;
}

export const WordWheelQuestionsEditor = ({ questions, onChange }: WordWheelQuestionsEditorProps) => {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // Get question by letter
  const getQuestionByLetter = (letter: string): WheelQuestion | undefined => {
    return questions.find(q => q.initial_letter === letter);
  };

  // Check if letter has a question
  const hasQuestion = (letter: string): boolean => {
    return questions.some(q => q.initial_letter === letter);
  };

  // Add or update question for a letter
  const setQuestionForLetter = (letter: string, questionText: string, answer: string) => {
    const existingIndex = questions.findIndex(q => q.initial_letter === letter);
    
    // Validate that answer starts with the letter
    if (answer.trim() && !answer.trim().toUpperCase().startsWith(letter)) {
      toast.error(`La respuesta debe empezar con la letra ${letter}`);
      return;
    }

    if (existingIndex >= 0) {
      // Update existing
      const updated = [...questions];
      updated[existingIndex] = {
        ...updated[existingIndex],
        question_text: questionText,
        correct_sentence: answer,
      };
      onChange(updated);
    } else {
      // Add new
      const newQuestion: WheelQuestion = {
        question_text: questionText,
        correct_sentence: answer,
        initial_letter: letter,
        points: 10,
        order_index: questions.length,
      };
      onChange([...questions, newQuestion]);
    }
  };

  // Delete question for a letter
  const deleteQuestionForLetter = (letter: string) => {
    const filtered = questions.filter(q => q.initial_letter !== letter);
    // Reindex
    filtered.forEach((q, i) => {
      q.order_index = i;
    });
    onChange(filtered);
    if (selectedLetter === letter) {
      setSelectedLetter(null);
    }
  };

  const selectedQuestion = selectedLetter ? getQuestionByLetter(selectedLetter) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left side: Question editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardContent className="p-6">
            {selectedLetter ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-foreground">
                        {selectedLetter}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Letra {selectedLetter}</h3>
                      <p className="text-sm text-muted-foreground">
                        La respuesta debe empezar con "{selectedLetter}"
                      </p>
                    </div>
                  </div>
                  {hasQuestion(selectedLetter) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteQuestionForLetter(selectedLetter)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Pregunta/Definición *</Label>
                  <Textarea
                    value={selectedQuestion?.question_text || ""}
                    onChange={(e) => {
                      setQuestionForLetter(
                        selectedLetter,
                        e.target.value,
                        selectedQuestion?.correct_sentence || ""
                      );
                    }}
                    placeholder={`Ej: Sentimiento de añoranza por el pasado...`}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Escribe una descripción o pregunta que guíe al usuario a la respuesta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Respuesta Correcta *</Label>
                  <Input
                    value={selectedQuestion?.correct_sentence || ""}
                    onChange={(e) => {
                      setQuestionForLetter(
                        selectedLetter,
                        selectedQuestion?.question_text || "",
                        e.target.value
                      );
                    }}
                    placeholder={`Debe empezar con ${selectedLetter}`}
                    className="text-lg font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    La palabra o frase que el usuario debe adivinar (debe empezar con {selectedLetter})
                  </p>
                </div>

                {selectedQuestion?.correct_sentence && 
                 !selectedQuestion.correct_sentence.trim().toUpperCase().startsWith(selectedLetter) && (
                  <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ La respuesta no empieza con la letra {selectedLetter}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👈</div>
                <h3 className="text-lg font-semibold mb-2">Selecciona una letra</h3>
                <p className="text-muted-foreground">
                  Haz clic en una letra de la derecha para empezar a crear preguntas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">📝 Consejos para crear preguntas:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Sé claro y específico en tus definiciones</li>
            <li>• Evita ambigüedades que puedan confundir al jugador</li>
            <li>• Verifica que cada respuesta empiece con la letra correcta</li>
            <li>• Las letras sin pregunta aparecerán bloqueadas en el juego</li>
          </ul>
        </div>
      </div>

      {/* Right side: Alphabet */}
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 text-center">
              Letras del Abecedario
            </h3>
            <div className="text-center mb-3">
              <Badge variant="secondary">
                {questions.length} de {ALPHABET.length} configuradas
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALPHABET.map((letter) => {
                const hasDef = hasQuestion(letter);
                const isSelected = selectedLetter === letter;
                
                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedLetter(letter)}
                    className={`
                      relative aspect-square rounded-lg font-bold text-lg
                      transition-all duration-200
                      ${isSelected 
                        ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                        : hasDef
                        ? "bg-green-500/20 text-green-700 dark:text-green-400 border-2 border-green-500/50 hover:scale-105"
                        : "bg-muted text-muted-foreground hover:bg-muted/70 hover:scale-105"
                      }
                    `}
                  >
                    {letter}
                    <div className="absolute -top-1 -right-1">
                      {hasDef ? (
                        <Unlock className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              {questions.length === 0 
                ? "Aún no hay preguntas configuradas"
                : `${ALPHABET.length - questions.length} letras sin configurar`
              }
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
