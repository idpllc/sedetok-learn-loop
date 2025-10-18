// Definición de las áreas académicas según el sistema educativo colombiano
export const academicAreas = [
  {
    id: 'ciencias_naturales',
    name: 'Ciencias Naturales',
    subjects: [
      'Biología', 'Física', 'Química', 'Ciencias Naturales',
      'Ecología', 'Educación Ambiental', 'Laboratorio de Ciencias'
    ]
  },
  {
    id: 'lengua_castellana',
    name: 'Lengua Castellana',
    subjects: [
      'Lengua Castellana', 'Lectura Crítica', 'Escritura y Redacción',
      'Comprensión de Lectura', 'Gramática y Ortografía', 
      'Literatura Colombiana y Universal'
    ]
  },
  {
    id: 'ciencias_sociales',
    name: 'Ciencias Sociales',
    subjects: [
      'Ciencias Sociales', 'Historia', 'Geografía',
      'Constitución Política y Democracia', 'Filosofía',
      'Cátedra de la Paz', 'Ética y Valores'
    ]
  },
  {
    id: 'matematicas',
    name: 'Matemáticas',
    subjects: [
      'Matemáticas', 'Geometría', 'Aritmética', 'Álgebra',
      'Estadística y Probabilidad', 'Trigonometría', 'Cálculo'
    ]
  },
  {
    id: 'lenguas_extranjeras',
    name: 'Lenguas Extranjeras',
    subjects: [
      'Inglés', 'Francés', 'Portugués',
      'Conversación en Inglés', 'Lectura y Escritura en Inglés'
    ]
  },
  {
    id: 'tecnologia',
    name: 'Tecnología e Informática',
    subjects: [
      'Informática Básica', 'Programación', 'Robótica Educativa',
      'Ofimática', 'Diseño Digital', 'Seguridad Informática',
      'Emprendimiento Digital', 'Tecnología e Informática'
    ]
  },
  {
    id: 'educacion_artistica',
    name: 'Educación Artística',
    subjects: [
      'Artes Plásticas', 'Música', 'Teatro', 'Danza',
      'Expresión Corporal', 'Apreciación del Arte'
    ]
  },
  {
    id: 'educacion_fisica',
    name: 'Educación Física',
    subjects: [
      'Educación Física', 'Recreación', 'Deportes',
      'Hábitos de Vida Saludable', 'Entrenamiento Deportivo'
    ]
  }
] as const;

export type AcademicAreaId = typeof academicAreas[number]['id'];

// Mapear una materia a su área correspondiente
export const getAreaForSubject = (subject: string): AcademicAreaId | null => {
  const normalizedSubject = subject.toLowerCase().trim();
  
  for (const area of academicAreas) {
    const found = area.subjects.some(s => 
      s.toLowerCase().includes(normalizedSubject) || 
      normalizedSubject.includes(s.toLowerCase())
    );
    
    if (found) {
      return area.id;
    }
  }
  
  // Mapeo adicional para categorías generales
  const categoryMap: Record<string, AcademicAreaId> = {
    'matematicas': 'matematicas',
    'ciencias': 'ciencias_naturales',
    'lenguaje': 'lengua_castellana',
    'historia': 'ciencias_sociales',
    'ingles': 'lenguas_extranjeras',
    'tecnologia': 'tecnologia',
    'arte': 'educacion_artistica',
    'deportes': 'educacion_fisica'
  };
  
  return categoryMap[normalizedSubject] || null;
};
