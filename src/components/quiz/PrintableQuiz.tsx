import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Loader2 } from "lucide-react";

interface PrintableQuizProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PrintQuestion {
  question_text: string;
  question_type: string;
  points: number;
  order_index: number;
  image_url?: string;
  quiz_options: Array<{
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }>;
}

// Strip HTML tags and return plain text
const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() || "";
};

// Extract image URLs from HTML content
const extractImagesFromHtml = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const imgs = doc.querySelectorAll("img");
  return Array.from(imgs).map((img) => img.getAttribute("src") || "").filter(Boolean);
};

export const PrintableQuiz = ({ quizId, quizTitle, open, onOpenChange }: PrintableQuizProps) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<PrintQuestion[]>([]);
  const [institutionName, setInstitutionName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && quizId) {
      fetchData();
    }
  }, [open, quizId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [questionsRes, profileRes] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("question_text, question_type, points, order_index, image_url, quiz_options(option_text, is_correct, order_index)")
          .eq("content_id", quizId)
          .order("order_index", { ascending: true }),
        user?.id
          ? supabase
              .from("institution_members")
              .select("institutions(name)")
              .eq("user_id", user.id)
              .eq("status", "active")
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (questionsRes.error) throw questionsRes.error;
      setQuestions((questionsRes.data as any) || []);

      if (profileRes.data && (profileRes.data as any)?.institutions?.name) {
        setInstitutionName((profileRes.data as any).institutions.name);
      }
    } catch (err) {
      console.error("Error fetching printable quiz:", err);
      toast.error("Error al cargar el quiz para imprimir");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión. Verifica los permisos de tu navegador.");
      return;
    }

    const today = new Date().toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const optionLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];

    const questionsHTML = questions
      .map((q, idx) => {
        const sortedOptions = [...q.quiz_options].sort((a, b) => a.order_index - b.order_index);

        let optionsHTML = "";
        if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
          optionsHTML = `
            <div class="options">
              ${sortedOptions
                .map(
                  (opt, oi) => `
                <div class="option">
                  <span class="option-letter">${optionLetters[oi] || oi + 1}.</span>
                  <span>${opt.option_text}</span>
                </div>
              `
                )
                .join("")}
            </div>`;
        } else if (q.question_type === "short_answer") {
          optionsHTML = `<div class="answer-line"></div>`;
        } else if (q.question_type === "open_ended") {
          optionsHTML = `
            <div class="answer-lines">
              <div class="answer-line"></div>
              <div class="answer-line"></div>
              <div class="answer-line"></div>
            </div>`;
        }

        const imageHTML = q.image_url
          ? `<div class="question-image"><img src="${q.image_url}" alt="Imagen pregunta ${idx + 1}" /></div>`
          : "";

        return `
          <div class="question">
            <div class="question-header">
              <span class="question-number">${idx + 1}.</span>
              <span class="question-text">${q.question_text}</span>
              <span class="question-points">(${q.points} pts)</span>
            </div>
            ${imageHTML}
            ${optionsHTML}
          </div>
        `;
      })
      .join("");

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${quizTitle} - Formato Imprimible</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page {
            size: A4;
            margin: 15mm 18mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            color: #1a1a1a;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .institution-name {
            font-size: 15pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .quiz-title {
            font-size: 13pt;
            font-weight: 600;
            margin-top: 4px;
          }
          .quiz-meta {
            font-size: 9pt;
            color: #555;
            margin-top: 4px;
          }
          .student-info {
            display: flex;
            gap: 16px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }
          .student-field {
            flex: 1;
            min-width: 180px;
            border-bottom: 1px solid #333;
            padding-bottom: 3px;
            font-size: 10pt;
          }
          .student-field .label {
            font-weight: 600;
            font-size: 9pt;
            color: #555;
          }
          .student-field .input-space {
            min-height: 18px;
          }
          .instructions {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 9pt;
            color: #444;
          }
          .question {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .question-header {
            display: flex;
            gap: 6px;
            align-items: baseline;
            margin-bottom: 6px;
          }
          .question-number {
            font-weight: 700;
            min-width: 22px;
          }
          .question-text {
            flex: 1;
            font-weight: 500;
          }
          .question-points {
            font-size: 9pt;
            color: #666;
            white-space: nowrap;
          }
          .question-image {
            margin: 6px 0;
            text-align: center;
          }
          .question-image img {
            max-width: 280px;
            max-height: 160px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .options {
            margin-left: 28px;
          }
          .option {
            display: flex;
            align-items: baseline;
            gap: 6px;
            margin-bottom: 4px;
            font-size: 10.5pt;
          }
          .option-letter {
            font-weight: 600;
            min-width: 18px;
          }
          .answer-line {
            margin-left: 28px;
            border-bottom: 1px solid #999;
            height: 24px;
            margin-bottom: 4px;
          }
          .answer-lines .answer-line {
            margin-bottom: 6px;
          }
          .footer {
            margin-top: 20px;
            border-top: 1px solid #ccc;
            padding-top: 8px;
            font-size: 9pt;
            color: #888;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${institutionName ? `<div class="institution-name">${institutionName}</div>` : ""}
          <div class="quiz-title">${quizTitle}</div>
          <div class="quiz-meta">Total: ${totalPoints} puntos · ${questions.length} preguntas</div>
        </div>

        <div class="student-info">
          <div class="student-field">
            <div class="label">Nombre del estudiante</div>
            <div class="input-space"></div>
          </div>
          <div class="student-field" style="max-width: 200px;">
            <div class="label">No. Documento</div>
            <div class="input-space"></div>
          </div>
          <div class="student-field" style="max-width: 160px;">
            <div class="label">Fecha</div>
            <div class="input-space">${today}</div>
          </div>
        </div>

        <div class="instructions">
          <strong>Instrucciones:</strong> Lea cuidadosamente cada pregunta y seleccione o escriba la respuesta correcta.
          Para preguntas de selección múltiple, encierre en un círculo la letra correspondiente.
        </div>

        ${questionsHTML}

        <div class="footer">
          <span>Generado desde Sedefy</span>
          <span>${today}</span>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Vista previa para imprimir
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div ref={printRef} className="border rounded-lg p-6 bg-background space-y-4 text-sm">
              {/* Header */}
              <div className="text-center border-b-2 border-foreground pb-3">
                {institutionName && (
                  <p className="text-base font-bold uppercase tracking-wide">{institutionName}</p>
                )}
                <p className="text-sm font-semibold mt-1">{quizTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {questions.reduce((s, q) => s + q.points, 0)} puntos · {questions.length} preguntas
                </p>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 border-b border-muted-foreground/50 pb-1">
                  <span className="text-xs text-muted-foreground font-semibold">Nombre del estudiante</span>
                </div>
                <div className="border-b border-muted-foreground/50 pb-1">
                  <span className="text-xs text-muted-foreground font-semibold">No. Documento</span>
                </div>
                <div className="border-b border-muted-foreground/50 pb-1">
                  <span className="text-xs text-muted-foreground font-semibold">Fecha</span>
                  <span className="text-xs ml-1">
                    {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4 mt-4">
                {questions.map((q, idx) => {
                  const sortedOptions = [...q.quiz_options].sort((a, b) => a.order_index - b.order_index);
                  const optionLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex gap-1 items-baseline">
                        <span className="font-bold">{idx + 1}.</span>
                        <span className="font-medium flex-1">{q.question_text}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">({q.points} pts)</span>
                      </div>
                      {q.image_url && (
                        <div className="ml-5">
                          <img src={q.image_url} alt="" className="max-w-[200px] max-h-[120px] border rounded" />
                        </div>
                      )}
                      {(q.question_type === "multiple_choice" || q.question_type === "true_false") && (
                        <div className="ml-6 space-y-1">
                          {sortedOptions.map((opt, oi) => (
                            <div key={oi} className="flex items-baseline gap-1 text-xs">
                              <span className="font-semibold">{optionLetters[oi] || oi + 1}.</span>
                              <span>{opt.option_text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.question_type === "short_answer" && (
                        <div className="ml-6 border-b border-muted-foreground/40 h-6" />
                      )}
                      {q.question_type === "open_ended" && (
                        <div className="ml-6 space-y-2">
                          <div className="border-b border-muted-foreground/40 h-6" />
                          <div className="border-b border-muted-foreground/40 h-6" />
                          <div className="border-b border-muted-foreground/40 h-6" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Imprimir / Descargar PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
