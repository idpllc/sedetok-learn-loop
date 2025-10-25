import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Copy, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WordOrderEditor } from "./WordOrderEditor";
import { GameQuestion } from "@/hooks/useGames";

interface GameStep2Props {
  questions: GameQuestion[];
  onChange: (questions: GameQuestion[]) => void;
}

export const GameStep2 = ({ questions, onChange }: GameStep2Props) => {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  const addQuestion = () => {
    const newQuestion: GameQuestion = {
      question_text: "",
      correct_sentence: "",
      words: [],
      points: 10,
      order_index: questions.length,
    };
    onChange([...questions, newQuestion]);
    setSelectedQuestionIndex(questions.length);
  };

  const updateQuestion = (index: number, updatedQuestion: GameQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    onChange(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Reindex remaining questions
    newQuestions.forEach((q, i) => {
      q.order_index = i;
    });
    onChange(newQuestions);
    if (selectedQuestionIndex >= newQuestions.length && newQuestions.length > 0) {
      setSelectedQuestionIndex(newQuestions.length - 1);
    }
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...questions[index] };
    questionToDuplicate.order_index = questions.length;
    delete questionToDuplicate.id;
    onChange([...questions, questionToDuplicate]);
    setSelectedQuestionIndex(questions.length);
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground">No hay preguntas todavía</p>
        <Button onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar primera pregunta
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[selectedQuestionIndex];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Questions List */}
      <div className="md:col-span-1 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Preguntas ({questions.length})</h3>
          <Button size="sm" onClick={addQuestion}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-colors ${
                selectedQuestionIndex === index ? "border-primary bg-accent" : ""
              }`}
              onClick={() => setSelectedQuestionIndex(index)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Pregunta {index + 1}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {question.question_text || "Sin título"}
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {question.words.length} palabras
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(index);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Question Editor */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Editar Pregunta {selectedQuestionIndex + 1}</CardTitle>
            <CardDescription>
              Configura la instrucción y las palabras que el usuario debe ordenar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentQuestion && (
              <WordOrderEditor
                question={currentQuestion}
                onChange={(updated) => updateQuestion(selectedQuestionIndex, updated)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
