import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Video, FileText, Loader2, X, ArrowRight, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useCreateContent } from "@/hooks/useCreateContent";
import { useQuizzes, useQuizQuestions } from "@/hooks/useQuizzes";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";
import { QuizStep2, QuizQuestion } from "./quiz/QuizStep2";
import { QuizStep3 } from "./quiz/QuizStep3";
import { PathBasicInfo } from "./learning-paths/wizard/PathBasicInfo";
import { PathBuilder } from "./learning-paths/wizard/PathBuilder";
import { PathReview } from "./learning-paths/wizard/PathReview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Combobox } from "@/components/ui/combobox";
import { subjects, subjectToCategoryMap } from "@/lib/subjects";

type CategoryType = Database["public"]["Enums"]["category_type"];
type ContentType = Database["public"]["Enums"]["content_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];

interface ContentData {
  id?: string;
  title: string;
  description?: string;
  category: CategoryType;
  grade_level: GradeLevel;
  content_type: ContentType;
  tags?: string[];
  video_url?: string;
  document_url?: string;
  thumbnail_url?: string;
}

interface CreateContentFormProps {
  editMode?: boolean;
  contentData?: ContentData;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  onTitleChange?: (title: string) => void;
}

export const CreateContentForm = ({ editMode = false, contentData, onUpdate, onTitleChange }: CreateContentFormProps) => {
  const navigate = useNavigate();
  const { toast: toastHook } = useToast();
  const { user } = useAuth();
  const { uploadFile, uploading } = useCloudinary();
  const { createMutation } = useCreateContent();
  const { createQuiz, updateQuiz } = useQuizzes();
  const { createQuestion, deleteQuestion } = useQuizQuestions();
  const { createPath, updatePath } = useLearningPaths(user?.id, 'created');
  const [isUpdating, setIsUpdating] = useState(false);
  const [quizStep, setQuizStep] = useState(0); // 0 = basic form, 1 = questions, 2 = config
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizConfig, setQuizConfig] = useState({
    time_limit: undefined as number | undefined,
    random_order: false,
    final_message: "¡Excelente trabajo! Has completado el quiz.",
  });
  
  // Learning Path states
  const [pathStep, setPathStep] = useState(1); // 1 = basic info, 2 = builder, 3 = review
  const [pathId, setPathId] = useState<string | null>(null);
  const [pathData, setPathData] = useState<any>({
    title: "",
    description: "",
    objectives: "",
    subject: "",
    topic: "",
    grade_level: "primaria",
    level: "",
    language: "Español",
    category: "matematicas",
    is_public: false,
    cover_url: "",
    enforce_order: false,
    require_quiz_pass: false,
    allow_collaboration: false,
    required_routes: [],
    tipo_aprendizaje: "",
    estimated_duration: 0,
  });

  // Detect URL parameter for content type
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const typeParam = searchParams.get('type');
    if (typeParam && !editMode) {
      if (typeParam === 'learning_path') {
        setFormData(prev => ({ ...prev, content_type: 'learning_path' as any }));
      } else {
        setFormData(prev => ({ ...prev, content_type: typeParam as ContentType }));
      }
    }
  }, [editMode]);
  
  // Load quiz questions if editing a quiz
  const quizId = editMode && contentData?.content_type === 'quiz' ? contentData?.id : undefined;
  const { questions: loadedQuestions, isLoading: questionsLoading } = useQuizQuestions(quizId);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "" as CategoryType,
    grade_level: "" as GradeLevel,
    content_type: "" as ContentType,
    difficulty: "basico" as "basico" | "intermedio" | "avanzado",
    document_url: "" as string | undefined,
  });
  
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedThumbnail, setUploadedThumbnail] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [fileType, setFileType] = useState<'video' | 'document' | 'image' | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [richText, setRichText] = useState("");

  useEffect(() => {
    if (editMode && contentData) {
      // Find the subject value from the label stored in DB
      const subjectValue = (contentData as any).subject 
        ? subjects.find(s => s.label === (contentData as any).subject)?.value || (contentData as any).subject
        : contentData.category;
      
      setFormData({
        title: contentData.title,
        description: contentData.description || "",
        category: contentData.category,
        subject: subjectValue,
        grade_level: contentData.grade_level,
        content_type: contentData.content_type,
        difficulty: (contentData as any).difficulty || "basico",
      } as any);
      setTags(contentData.tags || []);
      setIsPublic((contentData as any).is_public ?? true);
      setRichText((contentData as any).rich_text || "");
      
      // Load quiz config if editing a quiz
      if (contentData.content_type === 'quiz') {
        setQuizConfig({
          time_limit: (contentData as any).time_limit,
          random_order: (contentData as any).random_order || false,
          final_message: (contentData as any).final_message || "¡Excelente trabajo! Has completado el quiz.",
        });
      }
      
      if (contentData.video_url) {
        setFilePreview(contentData.video_url);
        setFileType('video');
      } else if (contentData.document_url) {
        setFilePreview(contentData.document_url.split('/').pop() || "");
        setFileType('document');
        // Load existing thumbnail for documents
        if (contentData.thumbnail_url) {
          setThumbnailPreview(contentData.thumbnail_url);
        }
      } else if (contentData.thumbnail_url) {
        setFilePreview(contentData.thumbnail_url);
        setFileType('image');
      }
    }
  }, [editMode, contentData]);
  
  // Load quiz questions when available
  useEffect(() => {
    if (loadedQuestions && loadedQuestions.length > 0 && editMode) {
      console.log("Loading questions:", loadedQuestions);
      setQuizQuestions(loadedQuestions as any);
    }
  }, [loadedQuestions, editMode]);

  // Update page title based on content type
  useEffect(() => {
    if (onTitleChange) {
      const titles: Record<ContentType | 'learning_path', string> = {
        video: "Crear Video",
        document: "Crear Recurso",
        lectura: "Crear Lectura",
        quiz: "Crear Quiz",
        learning_path: "Crear Ruta de Aprendizaje",
      };
      onTitleChange(formData.content_type ? titles[formData.content_type as ContentType | 'learning_path'] : "Crear Contenido");
    }
  }, [formData.content_type, onTitleChange]);

  const detectFileType = (file: File): 'video' | 'document' | 'image' | null => {
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const documentTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (videoTypes.includes(file.type)) return 'video';
    if (documentTypes.includes(file.type)) return 'document';
    if (imageTypes.includes(file.type)) return 'image';
    return null;
  };

  const validateFile = (file: File): boolean => {
    const type = detectFileType(file);
    
    if (!type) {
      toastHook({
        title: "Tipo de archivo no válido",
        description: "Por favor sube un video (MP4, MOV, AVI, MKV), recurso (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX) o imagen (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return false;
    }

    const maxSizes = {
      video: 500 * 1024 * 1024,
      document: 50 * 1024 * 1024,
      image: 10 * 1024 * 1024,
    };

    if (file.size > maxSizes[type]) {
      const maxSizeText = type === 'video' ? '500MB' : '50MB';
      toastHook({
        title: "Archivo muy grande",
        description: `El archivo no debe superar los ${maxSizeText}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;
    const type = detectFileType(file);
    if (!type) return;

    setUploadedFile(file);
    setFileType(type);

    if (type === 'video' || type === 'image') {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(file.name);
    }

    if (type === 'video') {
      setFormData({ ...formData, content_type: "video" as ContentType });
    } else if (type === 'document') {
      setFormData({ ...formData, content_type: "document" as ContentType });
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !validateFile(file)) return;
    const type = detectFileType(file);
    if (!type) return;

    setUploadedFile(file);
    setFileType(type);

    if (type === 'video' || type === 'image') {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(file.name);
    }

    if (type === 'video') {
      setFormData({ ...formData, content_type: "video" as ContentType });
    } else if (type === 'document') {
      setFormData({ ...formData, content_type: "document" as ContentType });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragActive(false); };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleProceedToQuestions = () => {
    if (!formData.title || !formData.category || !formData.grade_level) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }
    onTitleChange?.("Crear Quiz - Preguntas");
    setQuizStep(1);
  };

  const handleQuizSubmit = async (status: "borrador" | "publicado") => {
    if (!user) {
      toast.error("Debes iniciar sesión para crear un quiz");
      return;
    }

    if (quizQuestions.length < 5) {
      toast.error("Debes agregar al menos 5 preguntas antes de guardar el quiz");
      return;
    }

    // Si está publicando, validar que todas las preguntas tengan al menos una opción correcta
    if (status === "publicado") {
      const invalidQuestions = quizQuestions.filter(q => 
        !q.options || q.options.length === 0 || !q.options.some(o => o.is_correct)
      );
      if (invalidQuestions.length > 0) {
        toast.error("Todas las preguntas deben tener al menos una opción correcta para publicar el quiz");
        return;
      }
    }

    try {
      const quizData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subject: (formData as any).subject ? subjects.find(s => s.value === (formData as any).subject)?.label || (formData as any).subject : undefined,
        grade_level: formData.grade_level,
        difficulty: formData.difficulty,
        is_public: isPublic,
        status,
        time_limit: quizConfig.time_limit,
        random_order: quizConfig.random_order,
        final_message: quizConfig.final_message,
        tags: tags,
        creator_id: user.id,
      };

      let targetQuizId: string;

      // If editing, update existing quiz
      if (editMode && contentData?.id) {
        await updateQuiz.mutateAsync({ 
          id: contentData.id, 
          updates: quizData 
        } as any);
        targetQuizId = contentData.id;

        // Delete all existing questions before creating new ones
        if (loadedQuestions && loadedQuestions.length > 0) {
          for (const question of loadedQuestions) {
            await deleteQuestion.mutateAsync(question.id);
          }
        }
      } else {
        // Creating new quiz
        const createdQuiz = await createQuiz.mutateAsync(quizData as any);
        targetQuizId = createdQuiz.id;
      }

      // Create all questions
      const pointsPerQuestion = Math.round(100 / quizQuestions.length);
      
      for (let i = 0; i < quizQuestions.length; i++) {
        const question = quizQuestions[i];
        await createQuestion.mutateAsync({
          content_id: targetQuizId,
          question_text: question.question_text,
          question_type: question.question_type,
          image_url: question.image_url,
          video_url: question.video_url,
          feedback: question.feedback,
          feedback_correct: question.feedback_correct,
          feedback_incorrect: question.feedback_incorrect,
          comparison_mode: question.comparison_mode || 'exact',
          points: pointsPerQuestion,
          order_index: i,
          correct_answer: 0,
          options: question.options.map((opt, idx) => ({
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            order_index: idx,
            image_url: opt.image_url,
            video_url: opt.video_url,
          })),
        } as any);
      }

      toast.success(
        editMode 
          ? "¡Quiz actualizado exitosamente!" 
          : status === "publicado" 
            ? "¡Quiz publicado!" 
            : "Quiz guardado como borrador"
      );
      navigate("/profile");
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error(editMode ? "Error al actualizar el quiz" : "Error al guardar el quiz");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let videoUrl: string | undefined;
      let documentUrl: string | undefined;
      let thumbnailUrl: string | undefined;

      if (uploadedFile) {
        if (fileType === 'video') {
          videoUrl = await uploadFile(uploadedFile, "video");
          thumbnailUrl = videoUrl.replace(/\.[^/.]+$/, ".jpg");
        } else if (fileType === 'document') {
          documentUrl = await uploadFile(uploadedFile, "raw");
        } else if (fileType === 'image') {
          // Para imágenes, guardar como documento Y thumbnail para poder descargar y previsualizar
          const imageUrl = await uploadFile(uploadedFile, "raw");
          documentUrl = imageUrl;
          thumbnailUrl = imageUrl;
        }
      }

      // Upload thumbnail if provided (for documents)
      if (uploadedThumbnail && fileType === 'document') {
        thumbnailUrl = await uploadFile(uploadedThumbnail, "raw");
      }

      const contentPayload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subject: (formData as any).subject ? subjects.find(s => s.value === (formData as any).subject)?.label || (formData as any).subject : undefined,
        grade_level: formData.grade_level,
        content_type: formData.content_type,
        tags: tags,
        is_public: isPublic,
        video_url: videoUrl || (editMode ? contentData?.video_url : undefined),
        document_url: documentUrl || (editMode ? contentData?.document_url : undefined),
        thumbnail_url: thumbnailUrl || (editMode ? contentData?.thumbnail_url : undefined),
        rich_text: formData.content_type === 'lectura' ? richText : null,
      };

      if (editMode && contentData?.id && onUpdate) {
        setIsUpdating(true);
        await onUpdate(contentData.id, contentPayload);
        setIsUpdating(false);
        navigate("/profile");
      } else {
        await createMutation.mutateAsync(contentPayload);
        navigate("/");
      }
    } catch (error) {
      console.error("Error creating content:", error);
    }
  };

  const isLoading = uploading || createMutation.isPending || isUpdating;
  const isQuizMode = formData.content_type === 'quiz';
  const isPathMode = formData.content_type === 'learning_path' as any;

  const getFileTypeIcon = () => {
    if (!fileType) return <Upload className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
    if (fileType === 'video') return <Video className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
    if (fileType === 'document') return <FileText className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
    return <Upload className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
  };

  const getFileTypeText = () => {
    if (fileType === 'video') return 'Video';
    if (fileType === 'document') return 'Recurso PDF';
    if (fileType === 'image') return 'Imagen';
    return 'contenido';
  };

  // Learning Path wizard rendering
  if (isPathMode && pathStep > 0) {
    const pathSteps = [
      { number: 1, title: "Información Básica", component: PathBasicInfo },
      { number: 2, title: "Constructor Visual", component: PathBuilder },
      { number: 3, title: "Revisión y Publicación", component: PathReview },
    ];
    const progress = (pathStep / pathSteps.length) * 100;
    const CurrentPathComponent = pathSteps[pathStep - 1].component;

    const handlePathNext = async () => {
      if (pathStep === 1 && !pathId) {
        // Convert subject value to label before saving
        const pathDataToSave = {
          ...pathData,
          subject: pathData.subject ? subjects.find(s => s.value === pathData.subject)?.label || pathData.subject : pathData.subject
        };
        const result = await createPath.mutateAsync(pathDataToSave);
        setPathId(result.id);
      } else if (pathId) {
        if (pathStep === pathSteps.length) {
          const { data: pathContent } = await supabase
            .from("learning_path_content")
            .select("content_id, quiz_id")
            .eq("path_id", pathId)
            .order("order_index");

          if (pathContent && pathContent.length > 0) {
            const contentIds = pathContent.map(c => c.content_id).filter(Boolean);
            const quizIds = pathContent.map(c => c.quiz_id).filter(Boolean);

            const { data: existingPaths } = await supabase
              .from("learning_paths")
              .select(`id, learning_path_content(content_id, quiz_id)`)
              .neq("id", pathId)
              .eq("status", "published");

            const hasDuplicate = existingPaths?.some(path => {
              const existingContent = path.learning_path_content || [];
              if (existingContent.length !== pathContent.length) return false;
              
              const existingContentIds = existingContent.map((c: any) => c.content_id).filter(Boolean).sort();
              const existingQuizIds = existingContent.map((c: any) => c.quiz_id).filter(Boolean).sort();
              const currentContentIds = contentIds.sort();
              const currentQuizIds = quizIds.sort();

              return JSON.stringify(existingContentIds) === JSON.stringify(currentContentIds) &&
                     JSON.stringify(existingQuizIds) === JSON.stringify(currentQuizIds);
            });

            if (hasDuplicate) {
              toast.error("Ya existe una ruta publicada con exactamente el mismo contenido");
              return;
            }
          }

          await updatePath.mutateAsync({ 
            id: pathId, 
            updates: { 
              ...pathData,
              subject: pathData.subject ? subjects.find(s => s.value === pathData.subject)?.label || pathData.subject : pathData.subject,
              status: 'published',
              estimated_duration: pathData.estimated_duration,
              total_xp: pathData.total_xp 
            } 
          });
          
          toast.success("¡Ruta publicada exitosamente!");
          navigate("/learning-paths");
          return;
        } else {
          const pathDataToSave = {
            ...pathData,
            subject: pathData.subject ? subjects.find(s => s.value === pathData.subject)?.label || pathData.subject : pathData.subject
          };
          await updatePath.mutateAsync({ id: pathId, updates: pathDataToSave });
        }
      }

      if (pathStep < pathSteps.length) {
        setPathStep(pathStep + 1);
      }
    };

    const handlePathPrevious = () => {
      if (pathStep > 1) {
        setPathStep(pathStep - 1);
      } else {
        setFormData({ ...formData, content_type: "" as ContentType });
        setPathStep(1);
      }
    };

    const handlePathSaveDraft = async () => {
      const pathDataToSave = {
        ...pathData,
        subject: pathData.subject ? subjects.find(s => s.value === pathData.subject)?.label || pathData.subject : pathData.subject
      };
      if (pathId) {
        await updatePath.mutateAsync({ id: pathId, updates: pathDataToSave as any });
      } else {
        const result = await createPath.mutateAsync(pathDataToSave as any);
        setPathId(result.id);
      }
      toast.success("Borrador guardado");
      navigate("/learning-paths");
    };

    return (
      <div className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Paso {pathStep} de {pathSteps.length}: {pathSteps[pathStep - 1].title}
            </span>
            <Button variant="outline" size="sm" onClick={handlePathSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              Guardar borrador
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Path wizard step */}
        <CurrentPathComponent
          data={pathData}
          onChange={setPathData}
          pathId={pathId}
        />

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePathPrevious}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {pathStep === 1 ? "Cancelar" : "Anterior"}
          </Button>

          <div className="flex gap-2">
            {pathSteps.map((step) => (
              <div
                key={step.number}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step.number === pathStep
                    ? "bg-primary"
                    : step.number < pathStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          <Button onClick={handlePathNext} disabled={createPath.isPending || updatePath.isPending}>
            {pathStep === pathSteps.length ? "Publicar" : "Siguiente"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Quiz wizard rendering
  if (isQuizMode && quizStep > 0) {
    return (
      <div className="space-y-4 pb-6">
        {/* Steps indicator */}
        <div className="flex items-center justify-between px-2">
          {[1, 2].map((step, index) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    quizStep >= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step}
                </div>
                <p className="text-xs mt-2 text-center hidden md:block">
                  {step === 1 ? "Preguntas" : "Configuración"}
                </p>
              </div>
              {index < 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    quizStep > step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {quizStep === 1 && (
            <QuizStep2 
              questions={quizQuestions} 
              onChange={setQuizQuestions}
              onTimeLimitChange={(timeLimit) => setQuizConfig({ ...quizConfig, time_limit: timeLimit })}
              quizContext={{
                title: formData.title,
                description: formData.description,
                category: formData.category,
                grade_level: formData.grade_level,
                difficulty: formData.difficulty,
                document_url: formData.document_url,
              }}
            />
          )}
          {quizStep === 2 && (
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="text-xl font-semibold mb-2">Configuración Final</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Ajusta la configuración antes de publicar
              </p>
              <QuizStep3
                formData={quizConfig}
                questions={quizQuestions}
                onChange={(field, value) => setQuizConfig({ ...quizConfig, [field]: value })}
              />
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              const newStep = Math.max(0, quizStep - 1);
              setQuizStep(newStep);
              if (newStep === 0) {
                onTitleChange?.("Crear Quiz");
              } else if (newStep === 1) {
                onTitleChange?.("Crear Quiz - Preguntas");
              }
            }}
          >
            Anterior
          </Button>

          <div className="flex gap-2">
            {quizStep === 2 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleQuizSubmit("borrador")}
                  disabled={quizQuestions.length === 0}
                >
                  Guardar borrador
                </Button>
                <Button
                  onClick={() => handleQuizSubmit("publicado")}
                  disabled={quizQuestions.length === 0}
                >
                  Publicar
                </Button>
              </>
            )}

            {quizStep < 2 && (
              <Button
                onClick={() => {
                  const newStep = quizStep + 1;
                  setQuizStep(newStep);
                  if (newStep === 2) {
                    onTitleChange?.("Crear Quiz - Configuración");
                  }
                }}
                disabled={quizStep === 1 && quizQuestions.length === 0}
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal form or quiz step 1 (basic data)
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de contenido primero */}
      <div className="space-y-2">
        <Label htmlFor="content_type">Tipo de Contenido *</Label>
        <Select
          value={formData.content_type}
          onValueChange={(value) => {
            if (value === 'learning_path') {
              setFormData({ ...formData, content_type: value as any });
            } else {
              setFormData({ ...formData, content_type: value as ContentType });
            }
          }}
          required
          disabled={editMode}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">🎥 Video</SelectItem>
            <SelectItem value="document">📄 Recurso</SelectItem>
            <SelectItem value="lectura">📖 Lectura</SelectItem>
            <SelectItem value="quiz">📝 Quiz</SelectItem>
            <SelectItem value="learning_path">🗺️ Ruta de Aprendizaje</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isQuizMode && (
        <>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Nivel de dificultad *</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="intermedio">Intermedio</SelectItem>
                <SelectItem value="avanzado">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiz-document">Documento de referencia (Opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Adjunta un PDF, DOC, DOCX, XLS o XLSX para generar preguntas con IA basadas en el documento (2000 XP)
            </p>
            
            {!formData.document_url ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Input
                  id="quiz-document-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const validTypes = [
                      'application/pdf',
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'application/vnd.ms-excel',
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    ];

                    if (!validTypes.includes(file.type)) {
                      toast.error("Solo se permiten archivos PDF, DOC, DOCX, XLS, XLSX");
                      return;
                    }

                    try {
                      const url = await uploadFile(file, "raw");
                      setFormData({ ...formData, document_url: url });
                      toast.success("Documento adjuntado correctamente");
                    } catch (error) {
                      console.error("Error al subir documento:", error);
                    }
                  }}
                  disabled={uploading}
                  className="hidden"
                />
                <label htmlFor="quiz-document-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {uploading ? "Subiendo documento..." : "Haz clic para adjuntar un documento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, XLS, XLSX
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm">Documento adjuntado</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormData({ ...formData, document_url: undefined });
                    toast.success("Documento eliminado");
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Contenido según tipo */}
      {!isQuizMode && !isPathMode && (
        <>
          {formData.content_type === 'lectura' ? (
            <div className="space-y-2">
              <Label htmlFor="richText">Contenido de la Lectura</Label>
              <Textarea
                id="richText"
                value={richText}
                onChange={(e) => setRichText(e.target.value)}
                placeholder="Escribe aquí el contenido completo de la lectura..."
                className="min-h-[300px] resize-y"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="file">Contenido de la Cápsula</Label>
              <div
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Input
                  id="file"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={editMode}
                />
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    dragActive ? "bg-primary/20" : "bg-muted"
                  }`}>
                    {getFileTypeIcon()}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">
                      {dragActive ? `Suelta tu ${getFileTypeText()} aquí` : "Arrastra tu archivo aquí"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      o haz click para seleccionar
                    </p>
                     <p className="text-xs text-muted-foreground">
                      Videos (MP4, MOV, AVI, MKV), Recursos (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX) o Imágenes (JPG, PNG, WEBP)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Máx: Videos 500MB | Recursos y imágenes 50MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file")?.click()}
                    disabled={editMode}
                  >
                    Seleccionar archivo
                  </Button>
                </div>
              </div>
              {filePreview && (
                <div className="relative">
                  {fileType === 'video' && (
                    <>
                      <video src={filePreview} controls className="w-full rounded-lg mt-2" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-4 right-4"
                        onClick={() => {
                          setUploadedFile(null);
                          setFilePreview("");
                          setFileType(null);
                          setFormData({ ...formData, content_type: "" as ContentType });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {fileType === 'image' && (
                    <>
                      <img src={filePreview} alt="Preview" className="w-full rounded-lg mt-2 max-h-[300px] object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-4 right-4"
                        onClick={() => {
                          setUploadedFile(null);
                          setFilePreview("");
                          setFileType(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {fileType === 'document' && (
                    <div className="flex items-center justify-between gap-2 p-4 bg-muted rounded-lg mt-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">{filePreview}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedFile(null);
                          setFilePreview("");
                          setFileType(null);
                          setFormData({ ...formData, content_type: "" as ContentType });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Portada opcional para recursos (documentos) */}
              {fileType === 'document' && (
                <div className="space-y-2 mt-4 p-4 border rounded-lg bg-muted/50">
                  <Label htmlFor="thumbnail">Imagen de Portada del Recurso (Opcional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Sube una imagen de portada para previsualizar el recurso. Esta imagen se mostrará como fondo cuando se visualice el recurso.
                  </p>
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                        if (!imageTypes.includes(file.type)) {
                          toastHook({
                            title: "Tipo de archivo no válido",
                            description: "Solo se permiten imágenes (JPG, PNG, WEBP)",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          toastHook({
                            title: "Archivo muy grande",
                            description: "La portada no debe superar los 10MB",
                            variant: "destructive",
                          });
                          return;
                        }
                        setUploadedThumbnail(file);
                        setThumbnailPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {thumbnailPreview && (
                    <div className="relative mt-2">
                      <img 
                        src={thumbnailPreview} 
                        alt="Portada del recurso" 
                        className="w-full rounded-lg max-h-[200px] object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setUploadedThumbnail(null);
                          setThumbnailPreview("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">{isQuizMode ? "Título del Quiz" : "Título de la Cápsula"} *</Label>
        <Input
          id="title"
          placeholder={isQuizMode ? "Ej: Quiz de Matemáticas - Fracciones" : "Ej: Introducción a la Fotosíntesis"}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder={isQuizMode ? "Describe brevemente el contenido del quiz" : "Describe el contenido de tu cápsula..."}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría / Asignatura *</Label>
          <Combobox
            options={subjects}
            value={(formData as any).subject || ""}
            onChange={(value) => {
              // Map the subject to the correct category enum for the database
              const categoryValue = subjectToCategoryMap[value] || value;
              setFormData({ ...formData, category: categoryValue as CategoryType, subject: value } as any);
            }}
            placeholder="Selecciona asignatura"
            searchPlaceholder="Buscar asignatura..."
            emptyMessage="No se encontró la asignatura."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grade">Nivel *</Label>
          <Select
            value={formData.grade_level}
            onValueChange={(value) => setFormData({ ...formData, grade_level: value as GradeLevel })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primaria">Primaria</SelectItem>
              <SelectItem value="secundaria">Secundaria</SelectItem>
              <SelectItem value="preparatoria">Preparatoria</SelectItem>
              <SelectItem value="universidad">Universidad</SelectItem>
              <SelectItem value="libre">Libre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Etiquetas (presiona Enter para agregar)</Label>
        <Input
          id="tags"
          placeholder="Escribe una etiqueta y presiona Enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagInput}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeTag(tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="visibility">Visibilidad</Label>
          <p className="text-sm text-muted-foreground">
            {isPublic ? `${isQuizMode ? 'Quiz' : 'Cápsula'} pública - visible para todos` : `${isQuizMode ? 'Quiz' : 'Cápsula'} privada - solo tú puedes verla`}
          </p>
        </div>
        <Switch
          id="visibility"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      {isQuizMode ? (
        <Button 
          type="button" 
          className="w-full"
          onClick={handleProceedToQuestions}
          disabled={!formData.title || !formData.category || !formData.grade_level}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Crear Preguntas y Respuestas
        </Button>
      ) : isPathMode ? (
        <Button 
          type="button" 
          className="w-full"
          onClick={() => {
            if (!formData.title) {
              toast.error("Por favor ingresa un título para la ruta");
              return;
            }
            setPathData({
              ...pathData,
              title: formData.title,
              description: formData.description,
              category: formData.category,
              grade_level: formData.grade_level,
            });
            setPathStep(1);
          }}
          disabled={!formData.title}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Configurar Ruta de Aprendizaje
        </Button>
      ) : (
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {editMode ? "Guardando..." : "Publicando..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {editMode ? "Guardar Cambios" : "Publicar Cápsula"}
            </>
          )}
        </Button>
      )}
    </form>
  );
};
