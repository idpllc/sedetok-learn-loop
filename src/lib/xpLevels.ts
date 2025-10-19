export interface XPLevel {
  level: string;
  xpRequired: number;
  icon: string;
  benefits: string[];
}

export const xpLevels: XPLevel[] = [
  {
    level: "Principiante",
    xpRequired: 0,
    icon: "🌱",
    benefits: ["Acceso al contenido público", "Perfil básico"],
  },
  {
    level: "Estudiante",
    xpRequired: 500,
    icon: "📚",
    benefits: ["Badge de estudiante", "Acceso a contenido exclusivo"],
  },
  {
    level: "Explorador",
    xpRequired: 2000,
    icon: "🔍",
    benefits: ["Badge de explorador", "Acceso a rutas de aprendizaje"],
  },
  {
    level: "Investigador",
    xpRequired: 5000,
    icon: "🔬",
    benefits: ["Badge de investigador", "Participar en proyectos especiales"],
  },
  {
    level: "Experto",
    xpRequired: 10000,
    icon: "💡",
    benefits: ["Badge de experto", "Crear contenido avanzado"],
  },
  {
    level: "Maestro",
    xpRequired: 25000,
    icon: "🎓",
    benefits: ["Badge de maestro", "Mentor de estudiantes"],
  },
  {
    level: "Sabio",
    xpRequired: 50000,
    icon: "📖",
    benefits: ["Badge de sabio", "Crear rutas de aprendizaje premium"],
  },
  {
    level: "Erudito",
    xpRequired: 100000,
    icon: "🧠",
    benefits: ["Badge de erudito", "Acceso a comunidad exclusiva"],
  },
  {
    level: "Virtuoso",
    xpRequired: 250000,
    icon: "🎯",
    benefits: ["Badge de virtuoso", "Colaborar con instituciones"],
  },
  {
    level: "Prodigio",
    xpRequired: 500000,
    icon: "💫",
    benefits: ["Badge de prodigio", "Certificaciones especiales"],
  },
  {
    level: "Genio",
    xpRequired: 1000000,
    icon: "🌟",
    benefits: ["Badge de genio", "Embajador de la plataforma"],
  },
  {
    level: "Leyenda",
    xpRequired: 2500000,
    icon: "👑",
    benefits: ["Badge de leyenda", "Influencer educativo oficial"],
  },
  {
    level: "Mítico",
    xpRequired: 5000000,
    icon: "🏆",
    benefits: ["Badge mítico", "Líder de comunidad global"],
  },
  {
    level: "Inmortal",
    xpRequired: 10000000,
    icon: "⚡",
    benefits: ["Badge inmortal", "Legado en la historia de la plataforma"],
  },
];

/**
 * Calcula el nivel actual del usuario basado en sus puntos de experiencia
 */
export const getUserLevel = (experiencePoints: number): XPLevel => {
  // Encuentra el nivel más alto que el usuario ha alcanzado
  let currentLevel = xpLevels[0];
  
  for (let i = xpLevels.length - 1; i >= 0; i--) {
    if (experiencePoints >= xpLevels[i].xpRequired) {
      currentLevel = xpLevels[i];
      break;
    }
  }
  
  return currentLevel;
};

/**
 * Calcula el siguiente nivel que el usuario puede alcanzar
 */
export const getNextLevel = (experiencePoints: number): XPLevel | null => {
  const currentLevel = getUserLevel(experiencePoints);
  const currentIndex = xpLevels.findIndex(l => l.level === currentLevel.level);
  
  if (currentIndex < xpLevels.length - 1) {
    return xpLevels[currentIndex + 1];
  }
  
  return null; // Ya está en el nivel máximo
};

/**
 * Calcula el progreso hacia el siguiente nivel (0-100)
 */
export const getLevelProgress = (experiencePoints: number): number => {
  const currentLevel = getUserLevel(experiencePoints);
  const nextLevel = getNextLevel(experiencePoints);
  
  if (!nextLevel) {
    return 100; // Ya alcanzó el nivel máximo
  }
  
  const currentLevelXP = currentLevel.xpRequired;
  const nextLevelXP = nextLevel.xpRequired;
  const xpInCurrentLevel = experiencePoints - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  
  return Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));
};

/**
 * Calcula cuántos XP faltan para el siguiente nivel
 */
export const getXPToNextLevel = (experiencePoints: number): number => {
  const nextLevel = getNextLevel(experiencePoints);
  
  if (!nextLevel) {
    return 0; // Ya alcanzó el nivel máximo
  }
  
  return Math.max(0, nextLevel.xpRequired - experiencePoints);
};
