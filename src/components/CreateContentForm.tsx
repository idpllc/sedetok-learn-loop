import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Video, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [documentPreview, setDocumentPreview] = useState<string>("");

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
      if (contentData.video_url) setVideoPreview(contentData.video_url);
      if (contentData.document_url) setDocumentPreview(contentData.document_url.split('/').pop() || "");
    }
  }, [editMode, contentData]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      setDocumentPreview(file.name);
    }
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

      if (videoFile) {
        videoUrl = await uploadFile(videoFile, "video");
        thumbnailUrl = videoUrl.replace(/\.[^/.]+$/, ".jpg");
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

      <div className="space-y-4">
        {shouldShowVideo && (
          <div className="space-y-2">
            <Label htmlFor="video">Video {!formData.content_type && "(opcional)"}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("video")?.click()}
                className="w-full"
              >
                <Video className="w-4 h-4 mr-2" />
                {videoFile || videoPreview ? "Cambiar video" : "Subir video"}
              </Button>
            </div>
            {videoPreview && (
              <video src={videoPreview} controls className="w-full rounded-lg mt-2" />
            )}
          </div>
        )}

        {shouldShowDocument && (
          <div className="space-y-2">
            <Label htmlFor="document">Documento {!formData.content_type && "(opcional)"}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="document"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={handleDocumentChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("document")?.click()}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                {documentFile || documentPreview ? "Cambiar documento" : "Subir documento"}
              </Button>
            </div>
            {documentPreview && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mt-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm">{documentPreview}</span>
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
