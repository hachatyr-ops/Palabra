
export type Language = 'en' | 'ru';

export interface Word {
  id: string;
  index: number;
  spanish: string;
  russian: string;
  addedAt: number;
  isManual?: boolean;
}

export interface ImportReport {
  addedCount: number;
  skippedWords: { index?: number; spanish: string; russian: string; reason: string }[];
  duplicateCount: number;
  timestamp: number;
}

export interface QuizHistoryItem {
  id: string;
  total: number;
  correct: number;
  wrong: number;
  percentage: number;
  timestamp: number;
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
  continueBtn: string;
  placeholderSp: string;
  placeholderRu: string;
  autoTranslate: string;
  searchPlaceholder: string;
  totalWords: string;
  lastAdded: string;
  alreadyInDictionary: string;
  importNewAdded: string;
  importAllSuccess: string;
  importWordsSkipped: string;
  importReportTitle: string;
  importGotIt: string;
  duplicateFound: string;
  exportBtn: string;
  importBtn: string;
  importSuccess: string;
  importError: string;
  fileUploadBtn: string;
  fileUploadError: string;
  fileProcessing: string;
  quizRangeTitle: string;
  quizStartBtn: string;
  quizWordsCount: string;
  repeatBtn: string;
  quizHistoryTitle: string;
}
