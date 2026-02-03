
export type Language = 'en' | 'ru';

export interface Word {
  id: string;
  spanish: string;
  russian: string;
  addedAt: number;
  isManual?: boolean;
}

// Added TechnicalStack to support ProjectBlueprint structure
export interface TechnicalStack {
  category: string;
  items: string[];
}

// Added RoadmapPhase to support ProjectBlueprint structure
export interface RoadmapPhase {
  phase: string;
  tasks: string[];
}

// Added ProjectBlueprint as it was required by InstructionDisplay.tsx
export interface ProjectBlueprint {
  name: string;
  mission: string;
  technicalStack: TechnicalStack[];
  roadmap: RoadmapPhase[];
  guidelines: string[];
}

export interface Translations {
  welcome: string;
  langBtn: string;
  homeTab: string;
  dictionaryTab: string;
  quizTab: string;
  addWord: string;
  editWord: string;
  spanishLabel: string;
  russianLabel: string;
  saveBtn: string;
  updateBtn: string;
  cancelBtn: string;
  noWords: string;
  nextBtn: string;
  correct: string;
  wrong: string;
  aiHelpBtn: string;
  placeholderSp: string;
  placeholderRu: string;
  autoTranslate: string;
  searchPlaceholder: string;
  totalWords: string;
  lastAdded: string;
  alreadyInDictionary: string;
  exportBtn: string;
  importBtn: string;
  importSuccess: string;
  importError: string;
  // Added missing properties to match usage in i18n.ts and other components
  placeholder: string;
  generateBtn: string;
  copyBtn: string;
  resetBtn: string;
  techStack: string;
  roadmap: string;
  guidelines: string;
  voiceError: string;
  voiceListen: string;
  voiceProcess: string;
  stop: string;
}
