// Quiz scientist icons mapping
import marieCurie from "@/assets/quiz-icons/marie-curie.png";
import socrates from "@/assets/quiz-icons/socrates.png";
import einstein from "@/assets/quiz-icons/einstein.png";
import newton from "@/assets/quiz-icons/newton.png";
import darwin from "@/assets/quiz-icons/darwin.png";
import adaLovelace from "@/assets/quiz-icons/ada-lovelace.png";
import daVinci from "@/assets/quiz-icons/da-vinci.png";
import galileo from "@/assets/quiz-icons/galileo.png";

export type CategoryType = string;

interface ScientistIcon {
  icon: string;
  name: string;
}

const scientistMapping: Record<string, ScientistIcon> = {
  // Ciencias Naturales
  "ciencias_naturales": { icon: darwin, name: "Charles Darwin" },
  "biologia": { icon: darwin, name: "Charles Darwin" },
  "quimica": { icon: marieCurie, name: "Marie Curie" },
  "fisica": { icon: einstein, name: "Albert Einstein" },
  
  // Matemáticas
  "matematicas": { icon: newton, name: "Isaac Newton" },
  
  // Tecnología e Informática
  "tecnologia": { icon: adaLovelace, name: "Ada Lovelace" },
  "informatica": { icon: adaLovelace, name: "Ada Lovelace" },
  "computacion": { icon: adaLovelace, name: "Ada Lovelace" },
  
  // Humanidades
  "filosofia": { icon: socrates, name: "Sócrates" },
  "etica": { icon: socrates, name: "Sócrates" },
  
  // Arte y Creatividad
  "arte": { icon: daVinci, name: "Leonardo da Vinci" },
  "artes": { icon: daVinci, name: "Leonardo da Vinci" },
  "dibujo": { icon: daVinci, name: "Leonardo da Vinci" },
  
  // Ciencias Sociales (default to Socrates for wisdom)
  "ciencias_sociales": { icon: socrates, name: "Sócrates" },
  "historia": { icon: socrates, name: "Sócrates" },
  "geografia": { icon: galileo, name: "Galileo Galilei" },
  
  // Lenguaje (default to Da Vinci for Renaissance knowledge)
  "lenguaje": { icon: daVinci, name: "Leonardo da Vinci" },
  "literatura": { icon: daVinci, name: "Leonardo da Vinci" },
  "español": { icon: daVinci, name: "Leonardo da Vinci" },
  "ingles": { icon: daVinci, name: "Leonardo da Vinci" },
};

/**
 * Gets the scientist icon for a given category
 * Returns Einstein as default if category not found
 */
export const getQuizScientistIcon = (category: CategoryType): ScientistIcon => {
  if (!category) {
    return { icon: einstein, name: "Albert Einstein" };
  }
  
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, "_");
  
  return scientistMapping[normalizedCategory] || { icon: einstein, name: "Albert Einstein" };
};
