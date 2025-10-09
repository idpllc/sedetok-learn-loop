import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Video, FileText, Loader2, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useCreateContent } from "@/hooks/useCreateContent";
import { useQuizzes, useQuizQuestions } from "@/hooks/useQuizzes";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";
import { QuizStep2, QuizQuestion } from "./quiz/QuizStep2";
import { QuizStep3 } from "./quiz/QuizStep3";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

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
  const { createQuiz } = useQuizzes();
  const { createQuestion } = useQuizQuestions();
  const [isUpdating, setIsUpdating] = useState(false);
  const [quizStep, setQuizStep] = useState(0); // 0 = basic form, 1 = questions, 2 = config
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizConfig, setQuizConfig] = useState({
    time_limit: undefined as number | undefined,
    random_order: false,
    final_message: "¡Excelente trabajo! Has completado el quiz.",
  });
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "" as CategoryType,
    grade_level: "" as GradeLevel,
    content_type: "" as ContentType,
    difficulty: "basico" as "basico" | "intermedio" | "avanzado",
  });
  
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [fileType, setFileType] = useState<'video' | 'document' | 'image' | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [richText, setRichText] = useState("");

  useEffect(() => {
    if (editMode && contentData) {
      setFormData({
        title: contentData.title,
        description: contentData.description || "",
        category: contentData.category,
        grade_level: contentData.grade_level,
        content_type: contentData.content_type,
        difficulty: "basico",
      });
      setTags(contentData.tags || []);
      setIsPublic((contentData as any).is_public ?? true);
      setRichText((contentData as any).rich_text || "");
      if (contentData.video_url) {
        setFilePreview(contentData.video_url);
        setFileType('video');
      } else if (contentData.document_url) {
        setFilePreview(contentData.document_url.split('/').pop() || "");
        setFileType('document');
      } else if (contentData.thumbnail_url) {
        setFilePreview(contentData.thumbnail_url);
        setFileType('image');
      }
    }
  }, [editMode, contentData]);

  // Update page title based on content type
  useEffect(() => {
    if (onTitleChange) {
      const titles: Record<ContentType, string> = {
        video: "Crear Video",
        document: "Crear Documento",
        lectura: "Crear Lectura",
        quiz: "Crear Quiz",
      };
      onTitleChange(formData.content_type ? titles[formData.content_type] : "Crear Contenido");
    }
  }, [formData.content_type, onTitleChange]);

  const detectFileType = (file: File): 'video' | 'document' | 'image' | null => {
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const documentTypes = ['application/pdf'];
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
        description: "Por favor sube un video (MP4, MOV, AVI, MKV), documento PDF o imagen (JPG, PNG, WEBP)",
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
      const maxSizeText = type === 'video' ? '500MB' : type === 'document' ? '50MB' : '10MB';
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

    if (quizQuestions.length === 0) {
      toast.error("Debes agregar al menos una pregunta");
      return;
    }

    try {
      const quizData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        grade_level: formData.grade_level,
        difficulty: formData.difficulty,
        is_public: isPublic,
        status,
        time_limit: quizConfig.time_limit,
        random_order: quizConfig.random_order,
        final_message: quizConfig.final_message,
        creator_id: user.id,
      };

      const createdQuiz = await createQuiz.mutateAsync(quizData as any);

      for (let i = 0; i < quizQuestions.length; i++) {
        const question = quizQuestions[i];
        await createQuestion.mutateAsync({
          content_id: createdQuiz.id,
          question_text: question.question_text,
          question_type: question.question_type,
          image_url: question.image_url,
          video_url: question.video_url,
          feedback: question.feedback,
          points: question.points,
          order_index: i,
          correct_answer: 0,
          options: question.options.map((opt, idx) => ({
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            order_index: idx,
          })),
        } as any);
      }

      toast.success(status === "publicado" ? "¡Quiz publicado!" : "Quiz guardado como borrador");
      navigate("/profile");
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Error al guardar el quiz");
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
          thumbnailUrl = await uploadFile(uploadedFile, "raw");
        }
      }

      const contentPayload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
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

  const getFileTypeIcon = () => {
    if (!fileType) return <Upload className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
    if (fileType === 'video') return <Video className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
    if (fileType === 'document') return <FileText className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
    return <Upload className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />;
  };

  const getFileTypeText = () => {
    if (fileType === 'video') return 'Video';
    if (fileType === 'document') return 'Documento PDF';
    if (fileType === 'image') return 'Imagen';
    return 'contenido';
  };

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
            <QuizStep2 questions={quizQuestions} onChange={setQuizQuestions} />
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
          onValueChange={(value) => setFormData({ ...formData, content_type: value as ContentType })}
          required
          disabled={editMode}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="document">Documento</SelectItem>
            <SelectItem value="lectura">Lectura</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isQuizMode && (
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
      )}

      {/* Contenido según tipo */}
      {!isQuizMode && (
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
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,application/pdf,image/jpeg,image/jpg,image/png,image/webp"
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
                      Videos (MP4, MOV, AVI, MKV), PDFs o Imágenes (JPG, PNG, WEBP)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Máx: Videos 500MB | PDFs 50MB | Imágenes 10MB
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
          <Label htmlFor="category">Categoría *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value as CategoryType })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matematicas">Matemáticas</SelectItem>
              <SelectItem value="ciencias">Ciencias</SelectItem>
              <SelectItem value="lenguaje">Lenguaje</SelectItem>
              <SelectItem value="historia">Historia</SelectItem>
              <SelectItem value="arte">Arte</SelectItem>
              <SelectItem value="tecnologia">Tecnología</SelectItem>
              <SelectItem value="otros">Otros</SelectItem>
            </SelectContent>
          </Select>
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
