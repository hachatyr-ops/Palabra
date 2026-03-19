
export type Language = 'en' | 'ru';

export interface Word {
  id: string;
  spanish: string;
  russian: string;
  addedAt: number;
  isManual?: boolean;
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
  fileUploadBtn: string;
  fileUploadError: string;
  fileProcessing: string;
}
