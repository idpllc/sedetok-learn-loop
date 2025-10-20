// Lista completa de asignaturas/materias para el selector de categorías
export const subjects = [
  // Matemáticas y Ciencias Exactas
  { value: "matematicas", label: "Matemáticas" },
  { value: "algebra", label: "Álgebra" },
  { value: "geometria", label: "Geometría" },
  { value: "trigonometria", label: "Trigonometría" },
  { value: "calculo", label: "Cálculo" },
  { value: "estadistica", label: "Estadística" },
  { value: "probabilidad", label: "Probabilidad" },
  
  // Ciencias Naturales
  { value: "ciencias", label: "Ciencias" },
  { value: "biologia", label: "Biología" },
  { value: "quimica", label: "Química" },
  { value: "fisica", label: "Física" },
  { value: "astronomia", label: "Astronomía" },
  { value: "ecologia", label: "Ecología" },
  { value: "geologia", label: "Geología" },
  
  // Lenguaje y Comunicación
  { value: "lenguaje", label: "Lenguaje" },
  { value: "espanol", label: "Español" },
  { value: "gramatica", label: "Gramática" },
  { value: "literatura", label: "Literatura" },
  { value: "redaccion", label: "Redacción" },
  { value: "ortografia", label: "Ortografía" },
  
  // Idiomas
  { value: "ingles", label: "Inglés" },
  { value: "frances", label: "Francés" },
  { value: "aleman", label: "Alemán" },
  { value: "italiano", label: "Italiano" },
  { value: "portugues", label: "Portugués" },
  { value: "chino", label: "Chino" },
  { value: "japones", label: "Japonés" },
  
  // Ciencias Sociales
  { value: "historia", label: "Historia" },
  { value: "geografia", label: "Geografía" },
  { value: "civica", label: "Cívica y Ética" },
  { value: "filosofia", label: "Filosofía" },
  { value: "psicologia", label: "Psicología" },
  { value: "sociologia", label: "Sociología" },
  { value: "antropologia", label: "Antropología" },
  { value: "economia", label: "Economía" },
  { value: "derecho", label: "Derecho" },
  { value: "politica", label: "Ciencias Políticas" },
  
  // Tecnología e Ingeniería
  { value: "tecnologia", label: "Tecnología" },
  { value: "informatica", label: "Informática" },
  { value: "programacion", label: "Programación" },
  { value: "robotica", label: "Robótica" },
  { value: "electronica", label: "Electrónica" },
  { value: "ingenieria_civil", label: "Ingeniería Civil" },
  { value: "ingenieria_mecanica", label: "Ingeniería Mecánica" },
  { value: "ingenieria_electrica", label: "Ingeniería Eléctrica" },
  { value: "ingenieria_quimica", label: "Ingeniería Química" },
  { value: "ingenieria_industrial", label: "Ingeniería Industrial" },
  { value: "ingenieria_sistemas", label: "Ingeniería de Sistemas" },
  { value: "ingenieria_petroleos", label: "Ingeniería de Petróleos" },
  { value: "ingenieria_ambiental", label: "Ingeniería Ambiental" },
  
  // Artes
  { value: "arte", label: "Arte" },
  { value: "artes_visuales", label: "Artes Visuales" },
  { value: "musica", label: "Música" },
  { value: "teatro", label: "Teatro" },
  { value: "danza", label: "Danza" },
  { value: "dibujo", label: "Dibujo" },
  { value: "pintura", label: "Pintura" },
  { value: "escultura", label: "Escultura" },
  
  // Educación Física y Deportes
  { value: "educacion_fisica", label: "Educación Física" },
  { value: "deportes", label: "Deportes" },
  { value: "atletismo", label: "Atletismo" },
  { value: "futbol", label: "Fútbol" },
  { value: "baloncesto", label: "Baloncesto" },
  { value: "voleibol", label: "Voleibol" },
  
  // Negocios y Administración
  { value: "administracion", label: "Administración" },
  { value: "contabilidad", label: "Contabilidad" },
  { value: "finanzas", label: "Finanzas" },
  { value: "marketing", label: "Marketing" },
  { value: "emprendimiento", label: "Emprendimiento" },
  { value: "comercio", label: "Comercio" },
  
  // Salud y Medicina
  { value: "medicina", label: "Medicina" },
  { value: "enfermeria", label: "Enfermería" },
  { value: "odontologia", label: "Odontología" },
  { value: "farmacia", label: "Farmacia" },
  { value: "nutricion", label: "Nutrición" },
  { value: "salud_publica", label: "Salud Pública" },
  
  // Agricultura y Ganadería
  { value: "agronomia", label: "Agronomía" },
  { value: "veterinaria", label: "Veterinaria" },
  { value: "agricultura", label: "Agricultura" },
  { value: "ganaderia", label: "Ganadería" },
  { value: "gastronomia", label: "Gastronomía" },
  
  // Arquitectura y Diseño
  { value: "arquitectura", label: "Arquitectura" },
  { value: "diseno_grafico", label: "Diseño Gráfico" },
  { value: "diseno_industrial", label: "Diseño Industrial" },
  { value: "diseno_interiores", label: "Diseño de Interiores" },
  
  // Comunicación y Medios
  { value: "comunicacion", label: "Comunicación" },
  { value: "periodismo", label: "Periodismo" },
  { value: "publicidad", label: "Publicidad" },
  { value: "cine", label: "Cine y Audiovisual" },
  { value: "fotografia", label: "Fotografía" },
  
  // Religión y Ética
  { value: "religion", label: "Religión" },
  { value: "etica", label: "Ética" },
  { value: "valores", label: "Valores" },
  
  // Otros
  { value: "otros", label: "Otros" },
]

// Mapeo para mantener compatibilidad con el enum de la base de datos
export const subjectToCategoryMap: Record<string, string> = {
  // Matemáticas
  matematicas: "matematicas",
  algebra: "matematicas",
  geometria: "matematicas",
  trigonometria: "matematicas",
  calculo: "matematicas",
  estadistica: "matematicas",
  probabilidad: "matematicas",
  
  // Ciencias
  ciencias: "ciencias",
  biologia: "ciencias",
  quimica: "ciencias",
  fisica: "ciencias",
  astronomia: "ciencias",
  ecologia: "ciencias",
  geologia: "ciencias",
  
  // Lenguaje
  lenguaje: "lenguaje",
  espanol: "lenguaje",
  gramatica: "lenguaje",
  literatura: "lenguaje",
  redaccion: "lenguaje",
  ortografia: "lenguaje",
  ingles: "lenguaje",
  frances: "lenguaje",
  aleman: "lenguaje",
  italiano: "lenguaje",
  portugues: "lenguaje",
  chino: "lenguaje",
  japones: "lenguaje",
  
  // Historia
  historia: "historia",
  geografia: "historia",
  civica: "historia",
  filosofia: "historia",
  psicologia: "historia",
  sociologia: "historia",
  antropologia: "historia",
  economia: "historia",
  derecho: "historia",
  politica: "historia",
  
  // Arte
  arte: "arte",
  artes_visuales: "arte",
  musica: "arte",
  teatro: "arte",
  danza: "arte",
  dibujo: "arte",
  pintura: "arte",
  escultura: "arte",
  diseno_grafico: "arte",
  diseno_industrial: "arte",
  diseno_interiores: "arte",
  cine: "arte",
  fotografia: "arte",
  
  // Tecnología
  tecnologia: "tecnologia",
  informatica: "tecnologia",
  programacion: "tecnologia",
  robotica: "tecnologia",
  electronica: "tecnologia",
  ingenieria_civil: "tecnologia",
  ingenieria_mecanica: "tecnologia",
  ingenieria_electrica: "tecnologia",
  ingenieria_quimica: "tecnologia",
  ingenieria_industrial: "tecnologia",
  ingenieria_sistemas: "tecnologia",
  ingenieria_petroleos: "tecnologia",
  ingenieria_ambiental: "tecnologia",
  arquitectura: "tecnologia",
  
  // Otros
  educacion_fisica: "otros",
  deportes: "otros",
  atletismo: "otros",
  futbol: "otros",
  baloncesto: "otros",
  voleibol: "otros",
  administracion: "otros",
  contabilidad: "otros",
  finanzas: "otros",
  marketing: "otros",
  emprendimiento: "otros",
  comercio: "otros",
  medicina: "otros",
  enfermeria: "otros",
  odontologia: "otros",
  farmacia: "otros",
  nutricion: "otros",
  salud_publica: "otros",
  agronomia: "otros",
  veterinaria: "otros",
  agricultura: "otros",
  ganaderia: "otros",
  gastronomia: "otros",
  comunicacion: "otros",
  periodismo: "otros",
  publicidad: "otros",
  religion: "otros",
  etica: "otros",
  valores: "otros",
  otros: "otros",
}
