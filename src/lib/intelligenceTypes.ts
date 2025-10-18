// Definición de los 12 tipos de inteligencias múltiples
export const intelligenceTypes = [
  {
    id: 'logico_matematica',
    name: 'Lógico-Matemática',
    icon: '🧠',
    description: 'Razonamiento, cálculo y resolución de problemas',
    subjects: [
      'Matemáticas', 'Física', 'Química', 'Geometría', 'Aritmética',
      'Álgebra', 'Estadística y Probabilidad', 'Trigonometría', 'Cálculo'
    ]
  },
  {
    id: 'linguistico_verbal',
    name: 'Lingüístico-Verbal',
    icon: '🗣️',
    description: 'Uso efectivo del lenguaje oral y escrito',
    subjects: [
      'Lengua Castellana', 'Literatura Colombiana y Universal', 'Lectura Crítica',
      'Escritura y Redacción', 'Comprensión de Lectura', 'Gramática y Ortografía',
      'Inglés', 'Francés', 'Portugués', 'Conversación en Inglés', 
      'Lectura y Escritura en Inglés'
    ]
  },
  {
    id: 'visual_espacial',
    name: 'Visual-Espacial',
    icon: '🎨',
    description: 'Visualización y creación de imágenes mentales',
    subjects: [
      'Artes Plásticas', 'Geometría', 'Diseño Digital', 'Geografía',
      'Apreciación del Arte'
    ]
  },
  {
    id: 'musical',
    name: 'Musical',
    icon: '🎶',
    description: 'Sensibilidad al ritmo, tono y melodía',
    subjects: [
      'Música', 'Danza'
    ]
  },
  {
    id: 'corporal_kinestesica',
    name: 'Corporal-Kinestésica',
    icon: '🏃',
    description: 'Control y coordinación corporal',
    subjects: [
      'Educación Física', 'Recreación', 'Deportes', 'Teatro',
      'Expresión Corporal', 'Entrenamiento Deportivo', 
      'Hábitos de Vida Saludable'
    ]
  },
  {
    id: 'interpersonal',
    name: 'Interpersonal',
    icon: '🤝',
    description: 'Comprensión y relación con otros',
    subjects: [
      'Ética y Valores', 'Convivencia Escolar', 'Formación en Ciudadanía',
      'Constitución Política y Democracia', 'Cátedra de la Paz'
    ]
  },
  {
    id: 'intrapersonal',
    name: 'Intrapersonal',
    icon: '🧘',
    description: 'Autoconocimiento y gestión emocional',
    subjects: [
      'Proyecto de Vida', 'Ética y Valores', 'Educación para la Paz'
    ]
  },
  {
    id: 'naturalista',
    name: 'Naturalista',
    icon: '🌿',
    description: 'Comprensión del entorno natural',
    subjects: [
      'Ciencias Naturales', 'Biología', 'Ecología', 
      'Educación Ambiental', 'Agropecuaria'
    ]
  },
  {
    id: 'existencial',
    name: 'Existencial',
    icon: '💭',
    description: 'Reflexión sobre la vida y propósito',
    subjects: [
      'Filosofía', 'Religión', 'Cultura Religiosa y Espiritualidad',
      'Ética y Valores'
    ]
  },
  {
    id: 'digital_tecnologica',
    name: 'Digital-Tecnológica',
    icon: '💻',
    description: 'Comprensión y creación tecnológica',
    subjects: [
      'Tecnología e Informática', 'Informática Básica', 'Programación',
      'Robótica Educativa', 'Ofimática', 'Diseño Digital',
      'Seguridad Informática', 'Sistemas', 'Electrónica'
    ]
  },
  {
    id: 'creativa_innovadora',
    name: 'Creativa-Innovadora',
    icon: '🧩',
    description: 'Generación de ideas originales',
    subjects: [
      'Emprendimiento', 'Emprendimiento Digital', 'Artes Plásticas',
      'Diseño Digital', 'Teatro', 'Música'
    ]
  },
  {
    id: 'emocional',
    name: 'Emocional',
    icon: '🕊️',
    description: 'Gestión de emociones propias y ajenas',
    subjects: [
      'Ética y Valores', 'Convivencia Escolar', 'Educación para la Paz',
      'Proyecto de Vida', 'Formación en Ciudadanía'
    ]
  }
] as const;

export type IntelligenceTypeId = typeof intelligenceTypes[number]['id'];

// Mapear una materia a sus inteligencias correspondientes (una materia puede desarrollar múltiples inteligencias)
export const getIntelligencesForSubject = (subject: string): IntelligenceTypeId[] => {
  const normalizedSubject = subject.toLowerCase().trim();
  const matchedIntelligences: IntelligenceTypeId[] = [];
  
  for (const intelligence of intelligenceTypes) {
    const found = intelligence.subjects.some(s => 
      s.toLowerCase().includes(normalizedSubject) || 
      normalizedSubject.includes(s.toLowerCase())
    );
    
    if (found) {
      matchedIntelligences.push(intelligence.id);
    }
  }
  
  return matchedIntelligences;
};
