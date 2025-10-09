import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Video, FileText, Loader2, X } from "lucide-react";
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
import { Database } from "@/integrations/supabase/types";

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
}

export const CreateContentForm = ({ editMode = false, contentData, onUpdate }: CreateContentFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadFile, uploading } = useCloudinary();
  const { createMutation } = useCreateContent();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "" as CategoryType,
    grade_level: "" as GradeLevel,
    content_type: "" as ContentType,
  });
  
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [documentPreview, setDocumentPreview] = useState<string>("");
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false);
  const [videoDragActive, setVideoDragActive] = useState(false);
  const [documentDragActive, setDocumentDragActive] = useState(false);

  useEffect(() => {
    if (editMode && contentData) {
      setFormData({
        title: contentData.title,
        description: contentData.description || "",
        category: contentData.category,
        grade_level: contentData.grade_level,
        content_type: contentData.content_type,
      });
      setTags(contentData.tags || []);
      setIsPublic((contentData as any).is_public ?? true);
      if (contentData.thumbnail_url) setThumbnailPreview(contentData.thumbnail_url);
      if (contentData.video_url) setVideoPreview(contentData.video_url);
      if (contentData.document_url) setDocumentPreview(contentData.document_url.split('/').pop() || "");
    }
  }, [editMode, contentData]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageFile(file)) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      
      // Auto-detect content type based on file
      if (!formData.content_type && !videoFile && !documentFile) {
        // If only thumbnail is uploaded, don't auto-select type
      }
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateVideoFile(file)) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      
      // Auto-detect content type as video
      if (!formData.content_type) {
        setFormData({ ...formData, content_type: "video" as ContentType });
      }
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateDocumentFile(file)) {
      setDocumentFile(file);
      setDocumentPreview(file.name);
      
      // Auto-detect content type as document
      if (!formData.content_type) {
        setFormData({ ...formData, content_type: "document" as ContentType });
      }
    }
  };

  const validateImageFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Por favor sube una imagen válida (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return false;
    }
    
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "La imagen no debe superar los 10MB",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const validateVideoFile = (file: File): boolean => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const maxSize = 500 * 1024 * 1024; // 500MB
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Por favor sube un archivo de video válido (MP4, MOV, AVI, MKV)",
        variant: "destructive",
      });
      return false;
    }
    
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El video no debe superar los 500MB",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const validateDocumentFile = (file: File): boolean => {
    const validTypes = ['application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Por favor sube un archivo PDF",
        variant: "destructive",
      });
      return false;
    }
    
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El PDF no debe superar los 50MB",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleThumbnailDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setThumbnailDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && validateImageFile(file)) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setVideoDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && validateVideoFile(file)) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      
      // Auto-detect content type as video
      if (!formData.content_type) {
        setFormData({ ...formData, content_type: "video" as ContentType });
      }
    }
  };

  const handleDocumentDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDocumentDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && validateDocumentFile(file)) {
      setDocumentFile(file);
      setDocumentPreview(file.name);
      
      // Auto-detect content type as document
      if (!formData.content_type) {
        setFormData({ ...formData, content_type: "document" as ContentType });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleThumbnailDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setThumbnailDragActive(true);
  };

  const handleThumbnailDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setThumbnailDragActive(false);
  };

  const handleVideoDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setVideoDragActive(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setVideoDragActive(false);
  };

  const handleDocumentDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDocumentDragActive(true);
  };

  const handleDocumentDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDocumentDragActive(false);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let videoUrl: string | undefined;
      let documentUrl: string | undefined;
      let thumbnailUrl: string | undefined;

      if (thumbnailFile) {
        thumbnailUrl = await uploadFile(thumbnailFile, "raw");
      }

      if (videoFile) {
        videoUrl = await uploadFile(videoFile, "video");
        // Only auto-generate thumbnail if user didn't provide one
        if (!thumbnailUrl) {
          thumbnailUrl = videoUrl.replace(/\.[^/.]+$/, ".jpg");
        }
      }

      if (documentFile) {
        documentUrl = await uploadFile(documentFile, "raw");
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

  const shouldShowVideo = !formData.content_type || formData.content_type === "video";
  const shouldShowDocument = !formData.content_type || formData.content_type === "document";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="thumbnail">Imagen de Portada</Label>
        <div
          onDrop={handleThumbnailDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleThumbnailDragEnter}
          onDragLeave={handleThumbnailDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
            thumbnailDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <Input
            id="thumbnail"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleThumbnailChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              thumbnailDragActive ? "bg-primary/20" : "bg-muted"
            }`}>
              <Upload className={`w-8 h-8 ${thumbnailDragActive ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1">
                {thumbnailDragActive ? "Suelta la imagen aquí" : "Arrastra tu imagen aquí"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                o haz click para seleccionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos: JPG, PNG, WEBP (máx. 10MB)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("thumbnail")?.click()}
            >
              Seleccionar archivo
            </Button>
          </div>
        </div>
        {thumbnailPreview && (
          <div className="relative">
            <img src={thumbnailPreview} alt="Preview" className="w-full rounded-lg mt-2 max-h-[300px] object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-4 right-4"
              onClick={() => {
                setThumbnailFile(null);
                setThumbnailPreview("");
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título de la Cápsula</Label>
        <Input
          id="title"
          placeholder="Ej: Introducción a la Fotosíntesis"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Describe el contenido de tu cápsula..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
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
          <Label htmlFor="grade">Nivel</Label>
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
        <Label htmlFor="content_type">Tipo de Contenido</Label>
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
            <SelectItem value="quiz">Quiz</SelectItem>
          </SelectContent>
        </Select>
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
            {isPublic ? "Cápsula pública - visible para todos" : "Cápsula privada - solo tú puedes verla"}
          </p>
        </div>
        <Switch
          id="visibility"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      <div className="space-y-4">
        {shouldShowVideo && (
          <div className="space-y-2">
            <Label htmlFor="video">Video {!formData.content_type && "(opcional)"}</Label>
            <div
              onDrop={handleVideoDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleVideoDragEnter}
              onDragLeave={handleVideoDragLeave}
              className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                videoDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Input
                id="video"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                onChange={handleVideoChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  videoDragActive ? "bg-primary/20" : "bg-muted"
                }`}>
                  <Video className={`w-8 h-8 ${videoDragActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">
                    {videoDragActive ? "Suelta el video aquí" : "Arrastra tu video aquí"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    o haz click para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos: MP4, MOV, AVI, MKV (máx. 500MB)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("video")?.click()}
                >
                  Seleccionar archivo
                </Button>
              </div>
            </div>
            {videoPreview && (
              <div className="relative">
                <video src={videoPreview} controls className="w-full rounded-lg mt-2" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-4 right-4"
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {shouldShowDocument && (
          <div className="space-y-2">
            <Label htmlFor="document">Documento PDF {!formData.content_type && "(opcional)"}</Label>
            <div
              onDrop={handleDocumentDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDocumentDragEnter}
              onDragLeave={handleDocumentDragLeave}
              className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                documentDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Input
                id="document"
                type="file"
                accept="application/pdf"
                onChange={handleDocumentChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  documentDragActive ? "bg-primary/20" : "bg-muted"
                }`}>
                  <FileText className={`w-8 h-8 ${documentDragActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">
                    {documentDragActive ? "Suelta el PDF aquí" : "Arrastra tu PDF aquí"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    o haz click para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formato: PDF (máx. 50MB)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("document")?.click()}
                >
                  Seleccionar archivo
                </Button>
              </div>
            </div>
            {documentPreview && (
              <div className="flex items-center justify-between gap-2 p-4 bg-muted rounded-lg mt-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{documentPreview}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDocumentFile(null);
                    setDocumentPreview("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
    </form>
  );
};
