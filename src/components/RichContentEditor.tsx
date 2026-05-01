import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Image as ImageIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Sigma,
  Smile,
  Quote,
} from "lucide-react";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import katex from "katex";
import "katex/dist/katex.min.css";

interface RichContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const SPECIAL_CHARS = [
  "α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","π","ρ","σ","τ","υ","φ","χ","ψ","ω",
  "Α","Β","Γ","Δ","Ε","Ζ","Η","Θ","Λ","Ξ","Π","Σ","Φ","Ψ","Ω",
  "±","×","÷","≠","≈","≤","≥","∞","√","∑","∏","∫","∂","∇","∝","∈","∉","⊂","⊃","∪","∩","∅",
  "→","←","↑","↓","↔","⇒","⇐","⇔",
  "°","′","″","€","£","¥","©","®","™","§","¶","•","…","–","—",
];

const FORMULA_PRESETS = [
  { label: "x²", latex: "x^2" },
  { label: "√x", latex: "\\sqrt{x}" },
  { label: "a/b", latex: "\\frac{a}{b}" },
  { label: "Σ", latex: "\\sum_{i=1}^{n} i" },
  { label: "∫", latex: "\\int_{a}^{b} f(x)\\,dx" },
  { label: "lim", latex: "\\lim_{x \\to \\infty} f(x)" },
  { label: "π r²", latex: "\\pi r^2" },
  { label: "E=mc²", latex: "E = mc^2" },
];

export const RichContentEditor = ({
  content,
  onChange,
  placeholder,
  minHeight = "300px",
}: RichContentEditorProps) => {
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [latexInput, setLatexInput] = useState("");
  const [latexBlock, setLatexBlock] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: placeholder || "Escribe el contenido aquí...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm md:prose-base max-w-none p-4 focus:outline-none`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    try {
      toast({ title: "Subiendo imagen...", description: "Por favor espera" });
      const url = await uploadFile(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
        toast({ title: "Imagen agregada" });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la imagen", variant: "destructive" });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = "";
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleImageUpload(file);
        break;
      }
    }
  };

  const insertSpecialChar = (ch: string) => {
    editor?.chain().focus().insertContent(ch).run();
  };

  const insertFormula = (latex: string, block: boolean) => {
    if (!editor || !latex.trim()) return;
    let rendered = "";
    try {
      rendered = katex.renderToString(latex, { throwOnError: false, displayMode: block });
    } catch {
      rendered = latex;
    }
    const escaped = latex.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<span data-math="${block ? "block" : "inline"}" class="math-formula" contenteditable="false">${rendered}<!--${escaped}--></span>&nbsp;`;
    // Store the raw latex in a hidden span so we can re-render. We use a simple approach:
    const wrapper = `<span data-math="${block ? "block" : "inline"}">${escaped}</span>`;
    editor.chain().focus().insertContent(wrapper + "&nbsp;").run();
    setLatexInput("");
  };

  const setLink = () => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    setLinkUrl("");
  };

  if (!editor) return null;

  const ToolbarBtn = ({ active, onClick, title, children, disabled }: any) => (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Subrayado">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Cita">
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Izquierda">
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centro">
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Derecha">
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>
        <div className="w-px h-6 bg-border mx-1" />

        {/* Image */}
        <ToolbarBtn onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Insertar imagen">
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant={editor.isActive("link") ? "default" : "ghost"} className="h-8 w-8 p-0" title="Enlace">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={setLink}>Aplicar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().unsetLink().run()}>Quitar</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Special characters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Caracteres especiales">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid grid-cols-10 gap-1 max-h-64 overflow-y-auto">
              {SPECIAL_CHARS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => insertSpecialChar(ch)}
                  className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded text-base"
                >
                  {ch}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Math formulas */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Fórmula matemática (LaTeX)">
              <Sigma className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">LaTeX</Label>
                <Input
                  value={latexInput}
                  onChange={(e) => setLatexInput(e.target.value)}
                  placeholder="ej: \frac{a}{b} o x^2 + y^2 = z^2"
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={latexBlock} onChange={(e) => setLatexBlock(e.target.checked)} />
                  Bloque (centrado)
                </label>
              </div>
              {latexInput && (
                <div className="border rounded p-2 bg-muted/30 text-center min-h-12 flex items-center justify-center">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        try {
                          return katex.renderToString(latexInput, { throwOnError: false, displayMode: latexBlock });
                        } catch {
                          return "Vista previa no disponible";
                        }
                      })(),
                    }}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {FORMULA_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setLatexInput(p.latex)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Button type="button" size="sm" onClick={() => insertFormula(latexInput, latexBlock)} disabled={!latexInput.trim()}>
                Insertar fórmula
              </Button>
              <p className="text-xs text-muted-foreground">
                Tip: también puedes escribir fórmulas inline con <code>$...$</code> o en bloque con <code>$$...$$</code>.
              </p>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
          <Undo className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
          <Redo className="h-4 w-4" />
        </ToolbarBtn>
      </div>

      {/* Editor */}
      <div onPaste={handlePaste} className="max-h-[60vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
    </div>
  );
};
