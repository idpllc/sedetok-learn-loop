import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useStudyPlan, type Periodo, type Asignatura, type Competencia } from "@/hooks/useStudyPlan";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { ArrowLeft, BookOpen, GraduationCap, Calendar, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";

const getGradeColor = (nota: number | null) => {
  if (nota === null) return "text-muted-foreground";
  if (nota >= 4.5) return "text-green-500";
  if (nota >= 3.5) return "text-blue-500";
  if (nota >= 3.0) return "text-yellow-500";
  return "text-red-500";
};

const getGradeBadge = (nota: number | null) => {
  if (nota === null) return { label: "Pendiente", variant: "outline" as const };
  if (nota >= 4.5) return { label: "Superior", variant: "default" as const };
  if (nota >= 3.5) return { label: "Alto", variant: "secondary" as const };
  if (nota >= 3.0) return { label: "Básico", variant: "outline" as const };
  return { label: "Bajo", variant: "destructive" as const };
};

const AsignaturaCard = ({ asignatura }: { asignatura: Asignatura }) => {
  const totalEvals = asignatura.competencias.reduce((sum, c) => sum + c.evaluaciones.length, 0);
  const completedEvals = asignatura.competencias.reduce(
    (sum, c) => sum + c.evaluaciones.filter(e => e.nota !== null).length, 0
  );
  const progress = totalEvals > 0 ? (completedEvals / totalEvals) * 100 : 0;
  const badge = getGradeBadge(asignatura.nota_final_asignatura);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{asignatura.nombre_asignatura}</CardTitle>
          <div className="flex items-center gap-2">
            {asignatura.nota_final_asignatura !== null && (
              <span className={`text-lg font-bold ${getGradeColor(asignatura.nota_final_asignatura)}`}>
                {asignatura.nota_final_asignatura.toFixed(1)}
              </span>
            )}
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedEvals}/{totalEvals} evaluaciones
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="multiple" className="space-y-1">
          {asignatura.competencias.map((competencia, idx) => (
            <CompetenciaItem key={idx} competencia={competencia} />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

const CompetenciaItem = ({ competencia }: { competencia: Competencia }) => {
  const badge = getGradeBadge(competencia.calificacion_competencia);

  return (
    <AccordionItem value={competencia.nombre_competencia} className="border rounded-lg px-3">
      <AccordionTrigger className="py-3 hover:no-underline">
        <div className="flex items-center gap-2 flex-1 mr-2">
          <span className="text-sm font-medium text-left">{competencia.nombre_competencia}</span>
          <div className="ml-auto flex items-center gap-2">
            {competencia.calificacion_competencia !== null && (
              <span className={`text-sm font-bold ${getGradeColor(competencia.calificacion_competencia)}`}>
                {competencia.calificacion_competencia.toFixed(1)}
              </span>
            )}
            <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pb-2">
          {competencia.evaluaciones.map((evaluacion, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                {evaluacion.nota !== null ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">{evaluacion.descripcion}</span>
              </div>
              {evaluacion.nota !== null ? (
                <span className={`text-sm font-bold ${getGradeColor(evaluacion.nota)}`}>
                  {evaluacion.nota.toFixed(1)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Sin calificar</span>
              )}
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

const StudyPlan = () => {
  const { user, loading: authLoading } = useAuth();
  const { studyPlans, isLoading, documentNumber } = useStudyPlan();
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const currentPlan = selectedYear
    ? studyPlans?.find(p => p.academic_year === selectedYear)
    : studyPlans?.[0];

  if (!selectedYear && currentPlan) {
    // auto-select
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-56 pb-24 md:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 p-4 max-w-3xl mx-auto">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Mi Plan de Estudios</h1>
              {currentPlan && (
                <p className="text-xs text-muted-foreground">
                  {currentPlan.grade} · Año {currentPlan.academic_year}
                </p>
              )}
            </div>
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !studyPlans || studyPlans.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Sin plan de estudios</h2>
              <p className="text-sm text-muted-foreground">
                Tu institución aún no ha enviado tu plan de estudios. Contacta a tu coordinador académico para más información.
              </p>
              {!documentNumber && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-left">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      No tienes un número de documento registrado en tu perfil. Para vincular tu plan de estudios institucional, agrégalo desde tu perfil.
                    </span>
                  </p>
                </div>
              )}
              {documentNumber && (
                <p className="text-xs text-muted-foreground mt-3">
                  Documento registrado: <span className="font-mono">{documentNumber}</span>
                </p>
              )}
            </Card>
          ) : (
            <>
              {/* Year selector */}
              {studyPlans.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {studyPlans.map(plan => (
                    <button
                      key={plan.academic_year}
                      onClick={() => setSelectedYear(plan.academic_year)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        (selectedYear || studyPlans[0].academic_year) === plan.academic_year
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      {plan.academic_year}
                    </button>
                  ))}
                </div>
              )}

              {/* Periods */}
              {currentPlan?.periodos.map((periodo, periodoIdx) => (
                <div key={periodoIdx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h2 className="text-base font-bold">{periodo.periodo_nombre}</h2>
                  </div>
                  {periodo.asignaturas.map((asignatura, asigIdx) => (
                    <AsignaturaCard key={asigIdx} asignatura={asignatura} />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default StudyPlan;
