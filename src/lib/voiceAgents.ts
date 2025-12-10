// Pre-configured voice agents with Ready Player Me avatars
export interface VoiceAgent {
  id: string;
  name: string;
  description: string;
  agentId: string; // ElevenLabs Agent ID
  avatarUrl: string; // Ready Player Me avatar GLB URL
  personality: string;
  color: string; // Theme color for UI
}

// Ready Player Me avatar URLs - these are public demo avatars
// Users can create their own at https://readyplayer.me/
export const VOICE_AGENTS: VoiceAgent[] = [
  {
    id: 'sofia',
    name: 'Sofía',
    description: 'Tu tutora de aprendizaje general',
    agentId: '', // User will configure this
    avatarUrl: 'https://models.readyplayer.me/64c4a1e60f347b57f2c60c31.glb',
    personality: 'Amigable, paciente y motivadora. Especialista en explicar conceptos complejos de forma sencilla.',
    color: 'hsl(165 89% 24%)', // Primary green
  },
  {
    id: 'alejandro',
    name: 'Alejandro',
    description: 'Experto en ciencias y matemáticas',
    agentId: '', // User will configure this
    avatarUrl: 'https://models.readyplayer.me/64c4a2e60f347b57f2c60c33.glb',
    personality: 'Analítico, preciso y entusiasta. Le encanta resolver problemas paso a paso.',
    color: 'hsl(200 89% 40%)', // Blue
  },
];

// Viseme mapping for lip-sync
// Maps phonemes to Ready Player Me morph target names
export const VISEME_MAP: Record<string, string> = {
  'A': 'viseme_aa',
  'B': 'viseme_PP',
  'C': 'viseme_kk',
  'D': 'viseme_DD',
  'E': 'viseme_E',
  'F': 'viseme_FF',
  'G': 'viseme_kk',
  'H': 'viseme_aa',
  'I': 'viseme_I',
  'J': 'viseme_CH',
  'K': 'viseme_kk',
  'L': 'viseme_nn',
  'M': 'viseme_PP',
  'N': 'viseme_nn',
  'O': 'viseme_O',
  'P': 'viseme_PP',
  'Q': 'viseme_kk',
  'R': 'viseme_RR',
  'S': 'viseme_SS',
  'T': 'viseme_TH',
  'U': 'viseme_U',
  'V': 'viseme_FF',
  'W': 'viseme_U',
  'X': 'viseme_SS',
  'Y': 'viseme_I',
  'Z': 'viseme_SS',
  'sil': 'viseme_sil',
};

// All viseme morph target names used by Ready Player Me avatars
export const VISEME_TARGETS = [
  'viseme_sil',
  'viseme_PP',
  'viseme_FF',
  'viseme_TH',
  'viseme_DD',
  'viseme_kk',
  'viseme_CH',
  'viseme_SS',
  'viseme_nn',
  'viseme_RR',
  'viseme_aa',
  'viseme_E',
  'viseme_I',
  'viseme_O',
  'viseme_U',
];
