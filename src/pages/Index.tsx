import { ContentCard } from "@/components/ContentCard";
import { BottomNav } from "@/components/BottomNav";
import { FloatingActionButton } from "@/components/FloatingActionButton";

const mockContent = [
  {
    id: "1",
    title: "Ecuaciones Cuadráticas: Método de Factorización",
    creator: "Prof. María González",
    institution: "Instituto San Martín",
    tags: ["matemáticas", "álgebra", "ecuaciones"],
    category: "Matemáticas",
    grade: "Secundaria",
    likes: 1240,
    comments: 89,
    thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop"
  },
  {
    id: "2",
    title: "Fotosíntesis: El proceso que da vida al planeta",
    creator: "Dr. Carlos Méndez",
    institution: "Colegio Nacional",
    tags: ["biología", "plantas", "ciencia"],
    category: "Ciencias",
    grade: "Primaria",
    likes: 2150,
    comments: 143,
    thumbnail: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop"
  },
  {
    id: "3",
    title: "Verbos Irregulares en Inglés: Tips para Memorizar",
    creator: "Teacher Ana Smith",
    institution: "English Academy",
    tags: ["inglés", "gramática", "verbos"],
    category: "Lenguaje",
    grade: "Secundaria",
    likes: 980,
    comments: 67,
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop"
  },
  {
    id: "4",
    title: "La Revolución Francesa: Causas y Consecuencias",
    creator: "Prof. Roberto Díaz",
    institution: "Liceo Histórico",
    tags: ["historia", "francia", "revolución"],
    category: "Historia",
    grade: "Secundaria",
    likes: 1530,
    comments: 102,
    thumbnail: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop"
  },
  {
    id: "5",
    title: "Introducción a la Programación con Python",
    creator: "Dev. Laura Rodríguez",
    institution: "TechEdu",
    tags: ["programación", "python", "código"],
    category: "Tecnología",
    grade: "Preparatoria",
    likes: 3200,
    comments: 215,
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop"
  },
];

const Index = () => {
  return (
    <div className="relative">
      {/* Feed container with snap scroll */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {mockContent.map((content) => (
          <ContentCard key={content.id} {...content} />
        ))}
      </div>

      {/* Floating action button */}
      <FloatingActionButton />

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
