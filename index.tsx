import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Language, Word, ImportReport, QuizHistoryItem } from './types';
import { translations } from './i18n';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { translateWord, getRandomWord, parseVocabularyFromText } from './services/geminiService';
import mammoth from 'mammoth';

type SortOption = 'alpha-es' | 'alpha-ru' | 'index';
type ConfirmActionType = 'clearAll' | null;

const SPANISH_ALPHABET = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const ITEMS_PER_PAGE = 100;
const EXPORT_HEADER = "PALABRA_EXPORT_V1";

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  cancelText,
  variant = 'danger'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  confirmText: string; 
  cancelText: string;
  variant?: 'danger' | 'primary'
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-sm:rounded-[40px] rounded-[40px] p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 max-w-sm">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
          <i className={`fas fa-${variant === 'danger' ? 'exclamation-triangle' : (title.includes('мусор') || title.includes('Junk') || title.includes('Очистить') ? 'broom' : 'clone')}`}></i>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 leading-tight">{title}</h3>
          <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={onConfirm} variant={variant === 'danger' ? 'danger' : 'primary'} className="w-full h-14">
            {confirmText}
          </Button>
          <button onClick={onClose} className="py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const RangeSlider = ({ min, max, step, value, onChange }: { 
  min: number; 
  max: number; 
  step: number; 
  value: [number, number]; 
  onChange: (val: [number, number]) => void 
}) => {
  const [minValue, maxValue] = value;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), maxValue - step);
    onChange([val, maxValue]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), minValue + step);
    onChange([minValue, val]);
  };

  return (
    <div className="relative w-full h-12 flex items-center px-2">
      <div className="absolute left-2 right-2 h-2 bg-slate-100 rounded-full"></div>
      <div 
        className="absolute h-2 bg-blue-500 rounded-full"
        style={{ 
          left: `calc(8px + ${(minValue / max) * (100)}% - ${(minValue / max) * 16}px)`, 
          width: `${((maxValue - minValue) / max) * 100}%`
        }}
      ></div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minValue}
        onChange={handleMinChange}
        className="absolute left-0 w-full h-2 bg-transparent appearance-none pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-blue-500 [&::-moz-range-thumb]:shadow-xl [&::-moz-range-thumb]:border-none"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxValue}
        onChange={handleMaxChange}
        className="absolute left-0 w-full h-2 bg-transparent appearance-none pointer-events-none z-40 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-blue-500 [&::-moz-range-thumb]:shadow-xl [&::-moz-range-thumb]:border-none"
      />
    </div>
  );
};

const App = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('palabra_lang');
    return (saved as Language) || 'en';
  });
  
  const [words, setWords] = useState<Word[]>(() => {
    const saved = localStorage.getItem('palabra_words');
    return saved ? JSON.parse(saved) : [];
  });
  const [view, setView] = useState<'home' | 'dictionary' | 'quiz'>('home');
  const [lastSavedId, setLastSavedId] = useState<string | null>(() => localStorage.getItem('palabra_last_id'));
  const [newSp, setNewSp] = useState('');
  const [newRu, setNewRu] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGettingRandom, setIsGettingRandom] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editConfirmId, setEditConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('alpha-es');
  const [alphabetFilter, setAlphabetFilter] = useState('All');
  const [visibleItemsCount, setVisibleItemsCount] = useState(ITEMS_PER_PAGE);
  const [showCleanMenu, setShowCleanMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(() => {
    const saved = localStorage.getItem('palabra_import_report');
    return saved ? JSON.parse(saved) : null;
  });
  const [showReportModal, setShowReportModal] = useState(false);
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const alphabetScrollRef = useRef<HTMLDivElement>(null);
  const cleanMenuRef = useRef<HTMLDivElement>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizWords, setQuizWords] = useState<Word[]>([]);
  const [quizState, setQuizState] = useState<'setup' | 'playing'>('setup');
  const [quizRange, setQuizRange] = useState<[number, number]>([0, 100]);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>(() => {
    const saved = localStorage.getItem('palabra_quiz_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  useEffect(() => {
    // Deduplicate words by ID and the combination of Spanish/Russian text on mount
    setWords(prev => {
      const seenIds = new Set();
      const seenPairs = new Set();
      const unique = prev.filter(w => {
        const pairKey = `${w.spanish.trim().toLowerCase()}|${w.russian.trim().toLowerCase()}`;
        if (seenIds.has(w.id) || seenPairs.has(pairKey)) return false;
        seenIds.add(w.id);
        seenPairs.add(pairKey);
        return true;
      });
      return unique.length !== prev.length ? unique : prev;
    });
  }, []);

  useEffect(() => { localStorage.setItem('palabra_lang', lang); }, [lang]);
  useEffect(() => { 
    localStorage.setItem('palabra_words', JSON.stringify(words));
  }, [words]);
  useEffect(() => {
    if (importReport) localStorage.setItem('palabra_import_report', JSON.stringify(importReport));
  }, [importReport]);
  useEffect(() => { 
    if (lastSavedId) localStorage.setItem('palabra_last_id', lastSavedId); 
    else localStorage.removeItem('palabra_last_id');
  }, [lastSavedId]);

  useEffect(() => {
    localStorage.setItem('palabra_quiz_history', JSON.stringify(quizHistory));
  }, [quizHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cleanMenuRef.current && !cleanMenuRef.current.contains(event.target as Node)) {
        setShowCleanMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (deleteConfirmId) {
      const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirmId]);

  const toggleLang = () => setLang(l => l === 'en' ? 'ru' : 'en');

  const filteredAndSortedWords = useMemo(() => {
    let result = [...words];
    if (alphabetFilter !== 'All') result = result.filter(w => w.spanish.toUpperCase().startsWith(alphabetFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => w.spanish.toLowerCase().includes(q) || w.russian.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'alpha-es': return a.spanish.localeCompare(b.spanish);
        case 'alpha-ru': return a.russian.localeCompare(b.russian);
        case 'index': return (a.index || 0) - (b.index || 0);
        default: return 0;
      }
    });
    return result;
  }, [words, searchQuery, sortBy, alphabetFilter]);

  useEffect(() => {
    setVisibleItemsCount(ITEMS_PER_PAGE);
  }, [searchQuery, sortBy, alphabetFilter, view]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleItemsCount < filteredAndSortedWords.length) {
      setVisibleItemsCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleItemsCount, filteredAndSortedWords.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Use only manual entries and limit to 5
  const recentWords = useMemo(() => {
    return words.filter(w => w.isManual === true).slice(0, 5);
  }, [words]);

  const finishQuiz = useCallback(() => {
    const total = stats.correct + stats.wrong;
    if (total > 0) {
      const percentage = Math.round((stats.correct / total) * 100);
      const newResult: QuizHistoryItem = {
        id: generateId(),
        total,
        correct: stats.correct,
        wrong: stats.wrong,
        percentage,
        timestamp: Date.now()
      };
      setQuizHistory(prev => [newResult, ...prev].slice(0, 5));
    }
    setIsQuizFinished(true);
  }, [stats]);
  
  const goToNextWord = useCallback(() => {
    if (quizIndex + 1 < quizWords.length) {
      const nextIdx = quizIndex + 1;
      setQuizIndex(nextIdx);
      setSelectedOption(null);
      setQuizResult(null);
      const nextCorrect = quizWords[nextIdx].russian;
      const nextOthers = words.filter(w => w.russian !== nextCorrect).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.russian);
      setQuizOptions([nextCorrect, ...nextOthers].sort(() => Math.random() - 0.5));
    } else {
      finishQuiz();
    }
  }, [quizIndex, quizWords, words, finishQuiz]);

  const startQuiz = () => {
    if (words.length === 0) return;
    setQuizState('setup');
    setView('quiz');
  };

  const handleStartQuiz = () => {
    const total = words.length;
    const sortedWords = [...words].sort((a, b) => (a.index || 0) - (b.index || 0));
    
    const startIdx = Math.floor((quizRange[0] / 100) * total);
    const endIdx = Math.min(Math.floor((quizRange[1] / 100) * total), total);
    
    let selectedWords = sortedWords.slice(startIdx, endIdx);
    if (selectedWords.length === 0 && total > 0) {
      selectedWords = [sortedWords[Math.min(startIdx, total - 1)]];
    }

    const shuffled = [...selectedWords].sort(() => Math.random() - 0.5);
    setQuizWords(shuffled);
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizResult(null);
    setIsQuizFinished(false);
    setStats({ correct: 0, wrong: 0 });
    
    const correct = shuffled[0].russian;
    const others = words.filter(w => w.russian !== correct).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.russian);
    setQuizOptions([correct, ...others].sort(() => Math.random() - 0.5));
    
    setQuizState('playing');
  };

  const handleOptionSelect = (option: string) => {
    if (quizResult) return;
    const correct = quizWords[quizIndex].russian;
    setSelectedOption(option);
    if (option === correct) {
      setQuizResult('correct');
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setQuizResult('wrong');
      setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSp.trim() || !newRu.trim()) return;
    const duplicate = words.find(w => 
      w.spanish.toLowerCase() === newSp.trim().toLowerCase() && 
      w.russian.toLowerCase() === newRu.trim().toLowerCase()
    );
    if (duplicate && !editingId) {
      setLastSavedId(duplicate.id);
      setDuplicateError(true);
      setTimeout(() => setDuplicateError(false), 3000);
      return;
    }
    let finalId = '';
    if (editingId) {
      setWords(words.map(w => w.id === editingId ? { ...w, spanish: newSp, russian: newRu } : w));
      finalId = editingId;
      setEditingId(null);
    } else {
      const nextIndex = words.length > 0 ? Math.max(...words.map(w => w.index || 0)) + 1 : 1;
      const word: Word = { id: generateId(), index: nextIndex, spanish: newSp, russian: newRu, addedAt: Date.now(), isManual: true };
      setWords([word, ...words]);
      finalId = word.id;
    }
    setLastSavedId(finalId);
    setNewSp(''); setNewRu('');
  };

  const handleEdit = (word: Word, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (editConfirmId === word.id) {
      setEditingId(word.id);
      setNewSp(word.spanish); setNewRu(word.russian);
      setView('home');
      setEditConfirmId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setEditConfirmId(word.id);
      setDeleteConfirmId(null);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (deleteConfirmId === id) {
      setWords(prev => prev.filter(w => w.id !== id));
      if (lastSavedId === id) setLastSavedId(null);
      setDeleteConfirmId(null);
    } else { 
      setDeleteConfirmId(id); 
      setEditConfirmId(null);
    }
  };

  const initiateClearAll = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowCleanMenu(false); setConfirmAction('clearAll'); };

  const showLastReport = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowCleanMenu(false);
    if (importReport) setShowReportModal(true);
    else alert(lang === 'ru' ? 'Отчетов пока нет.' : 'No reports yet.');
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'clearAll') { setWords([]); setLastSavedId(null); }
    setConfirmAction(null);
  };

  const handleAutoTranslate = async () => {
    if (!newSp.trim() && !newRu.trim()) return;
    setIsTranslating(true);
    
    if (newSp.trim()) {
      const translated = await translateWord(newSp, 'ru');
      if (translated) setNewRu(translated);
    } else if (newRu.trim()) {
      const translated = await translateWord(newRu, 'ru');
      if (translated) setNewSp(translated);
    }
    
    setIsTranslating(false);
  };

  const handleRandomWord = async () => {
    setIsGettingRandom(true);
    const result = await getRandomWord(lang, 'All');
    setNewSp(result.spanish); setNewRu(result.russian);
    setIsGettingRandom(false); 
  };

  const handleExport = () => {
    const textData = `${EXPORT_HEADER}\n` + words.map(w => `${w.index}. ${w.spanish} - ${w.russian}`).join('\n');
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `palabra_export_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileProcessing(true);
    try {
      let textContent = "";
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        textContent = result.value;
      } else if (fileName.endsWith('.doc')) {
        textContent = await file.text();
      } else if (fileName.endsWith('.txt')) {
        textContent = await file.text();
        
        // Manual parsing for the requested format: "number. Spanish - Russian"
        // and handling "#" comments
        const lines = textContent.split('\n');
        const newWords: Word[] = [];
        const skipped: ImportReport['skippedWords'] = [];
        let currentMaxIndex = words.length > 0 ? Math.max(...words.map(w => w.index || 0)) : 0;

        // Check if it's our internal export format or the user's custom format
        const isInternalExport = textContent.startsWith(EXPORT_HEADER);
        const startIndex = isInternalExport ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line.startsWith('#')) continue;

          // Regex to match: [index.] Spanish [separator] Russian
          // Separators: only dash-like characters (-, —, –)
          const match = line.match(/^(\d+)?\.?\s*(.+?)\s*([-—–])\s*(.+)$/);
          
          if (match) {
            const parsedIndex = match[1] ? parseInt(match[1]) : null;
            const sp = match[2].trim();
            const ru = match[4].trim(); // match[3] is the separator
            
            if (sp && ru) {
              const index = parsedIndex || ++currentMaxIndex;
              if (parsedIndex && parsedIndex > currentMaxIndex) currentMaxIndex = parsedIndex;
              
              newWords.push({
                id: generateId(),
                index,
                spanish: sp,
                russian: ru,
                addedAt: Date.now(),
                isManual: false
              });
            } else {
              skipped.push({ spanish: line, russian: '', reason: lang === 'ru' ? 'Неполные данные' : 'Incomplete data' });
            }
          } else {
            // Try splitting by dash-like separators
            const parts = line.split(/\s*([-—–])\s*/);
            // If split results in parts but not enough for a pair, or no split at all
            if (parts.length >= 3 && parts[0].trim() && parts[2].trim()) {
              newWords.push({
                id: generateId(),
                index: ++currentMaxIndex,
                spanish: parts[0].trim(),
                russian: parts[2].trim(),
                addedAt: Date.now(),
                isManual: false
              });
            } else {
              skipped.push({ spanish: line, russian: '', reason: lang === 'ru' ? 'Неверный формат' : 'Invalid format' });
            }
          }
        }

        if (newWords.length > 0 || skipped.length > 0) {
          const existingPairs = new Set(words.map(w => `${w.spanish.toLowerCase()}|${w.russian.toLowerCase()}`));
          const uniqueNew: Word[] = [];
          const seenInBatch = new Set();
          let duplicateCount = 0;
          
          for (const nw of newWords) {
            const key = `${nw.spanish.toLowerCase()}|${nw.russian.toLowerCase()}`;
            if (existingPairs.has(key) || seenInBatch.has(key)) {
              duplicateCount++;
            } else {
              uniqueNew.push(nw);
              seenInBatch.add(key);
            }
          }

          if (uniqueNew.length > 0) {
            setWords(prev => [...uniqueNew, ...prev]);
          }

          const report: ImportReport = {
            addedCount: uniqueNew.length,
            skippedWords: skipped.sort((a, b) => (a.index || 0) - (b.index || 0)),
            duplicateCount,
            timestamp: Date.now()
          };
          setImportReport(report);
          setShowReportModal(true);
          
          setIsFileProcessing(false);
          e.target.value = '';
          return;
        }
      } else {
        alert(t.fileUploadError);
        return;
      }

      // If manual parsing didn't yield results or for docx, use Gemini
      if (textContent.trim()) {
        const parsedWords = await parseVocabularyFromText(textContent);
        if (parsedWords && parsedWords.length > 0) {
          let currentMaxIndex = words.length > 0 ? Math.max(...words.map(w => w.index || 0)) : 0;
          const newWords: Word[] = parsedWords.map(pw => {
            const index = pw.index || ++currentMaxIndex;
            if (pw.index && pw.index > currentMaxIndex) currentMaxIndex = pw.index;
            return {
              id: generateId(),
              index,
              spanish: pw.es,
              russian: pw.ru,
              addedAt: Date.now(),
              isManual: false
            };
          });

          const existingPairs = new Set(words.map(w => `${w.spanish.toLowerCase()}|${w.russian.toLowerCase()}`));
          const uniqueNew: Word[] = [];
          const seenInBatch = new Set();
          let duplicateCount = 0;
          
          for (const nw of newWords) {
            const key = `${nw.spanish.toLowerCase()}|${nw.russian.toLowerCase()}`;
            if (existingPairs.has(key) || seenInBatch.has(key)) {
              duplicateCount++;
            } else {
              uniqueNew.push(nw);
              seenInBatch.add(key);
            }
          }

          if (uniqueNew.length > 0) {
            setWords(prev => [...uniqueNew, ...prev]);
          }

          const report: ImportReport = {
            addedCount: uniqueNew.length,
            skippedWords: [],
            duplicateCount,
            timestamp: Date.now()
          };
          setImportReport(report);
          setShowReportModal(true);
        } else {
          alert(t.importError);
        }
      }
    } catch (err) {
      console.error(err);
      alert(t.fileUploadError);
    } finally {
      setIsFileProcessing(false);
      e.target.value = '';
    }
  };

  const scrollAlphabet = (direction: 'left' | 'right') => {
    if (alphabetScrollRef.current) {
      const scrollAmount = 150;
      alphabetScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] font-sans text-slate-900 pb-32">
      <Header lang={lang} onToggleLang={toggleLang} langLabel={t.langBtn} />
      
      <ConfirmationModal 
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={lang === 'ru' ? 'Удалить всё?' : 'Clear All?'}
        message={lang === 'ru' ? 'Это действие навсегда удалит весь ваш словарь. Вы уверены?' : 'This will permanently delete all your words. Are you sure?'}
        confirmText={lang === 'ru' ? 'ДА, УДАЛИТЬ' : 'YES, DELETE'}
        cancelText={lang === 'ru' ? 'ОТМЕНА' : 'CANCEL'}
        variant="danger"
      />

      {showReportModal && importReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowReportModal(false)}></div>
          <div className="relative bg-white w-full rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-w-md max-h-[80vh] flex flex-col">
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-3xl font-black text-slate-900 leading-tight">{t.importReportTitle}</h3>
              <div className="flex flex-col gap-1">
                <p className="text-slate-500 text-sm font-medium">{t.importNewAdded}: {importReport.addedCount}</p>
                {importReport.duplicateCount > 0 && (
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{t.alreadyInDictionary}: {importReport.duplicateCount}</p>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {importReport.skippedWords.length > 0 ? (
                <>
                  <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-3">{t.importWordsSkipped} ({importReport.skippedWords.length})</h4>
                  {importReport.skippedWords.map((w, i) => (
                    <div key={i} className="bg-red-50/30 p-4 rounded-[24px] border border-red-200 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-base break-words">
                          {w.index && <span className="text-red-500 mr-2">{w.index}.</span>}
                          {w.spanish}
                        </p>
                        {w.russian && <p className="text-[11px] font-medium text-slate-400 mt-0.5">{w.russian}</p>}
                      </div>
                      <span className="text-[9px] font-black uppercase text-red-500 bg-white px-3 py-1.5 rounded-xl border border-red-200 shrink-0 whitespace-nowrap shadow-sm">{w.reason}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">{t.importAllSuccess}</p>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button onClick={() => setShowReportModal(false)} className="w-full h-16 bg-blue-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all">
                {t.importGotIt}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-4">
        <div className="sticky top-[60px] z-40 bg-white border-b border-slate-100 py-2 mb-4 -mx-4 px-4 shadow-sm">
            <div className="bg-slate-100/50 p-1.5 rounded-[22px] flex shadow-inner-sm">
              {(['home', 'dictionary', 'quiz'] as const).map(v => (
                <button 
                  key={v} 
                  type="button" 
                  onClick={() => v === 'quiz' ? startQuiz() : setView(v)} 
                  className={`flex-1 py-3.5 rounded-[18px] font-black text-[11px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                    view === v 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'text-slate-400 active:bg-slate-200/50'
                  }`}
                >
                  <i className={`fas fa-${v === 'home' ? 'plus-circle' : v === 'dictionary' ? 'book-open' : 'bolt'} ${view === v ? 'text-white' : 'text-slate-300'}`}></i>
                  {t[`${v}Tab` as keyof typeof t]}
                </button>
              ))}
            </div>
        </div>

        {view === 'home' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <form onSubmit={handleSubmit} className={`bg-white p-5 rounded-[32px] shadow-2xl shadow-blue-900/5 border transition-all space-y-3 ${editingId ? 'border-orange-200 ring-4 ring-orange-50' : 'border-slate-50'}`}>
              <div className="flex items-center justify-between pb-1">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">{editingId ? t.editWord : t.addWord}</h3>
                {!editingId && <button type="button" onClick={handleRandomWord} disabled={isGettingRandom} className="text-[10px] font-black uppercase text-white bg-indigo-500 hover:bg-indigo-600 px-5 py-2 rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-indigo-100">{isGettingRandom ? '...' : (lang === 'ru' ? 'РАНДОМ' : 'RANDOM')}</button>}
              </div>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{t.spanishLabel}</label>
                  <div className="relative">
                    <input className="w-full py-2.5 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all text-lg font-medium placeholder:text-slate-300 pr-12" placeholder={t.placeholderSp} value={newSp} onChange={e => { setNewSp(e.target.value); setDuplicateError(false); }} />
                    {newSp && (
                      <button type="button" onClick={() => setNewSp('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors">
                        <i className="fas fa-times-circle"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.russianLabel}</label>
                    <button type="button" onClick={handleAutoTranslate} disabled={isTranslating || (!newSp.trim() && !newRu.trim())} className="text-[10px] font-black uppercase bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-300 shadow-md shadow-blue-100">{isTranslating ? '...' : t.autoTranslate}</button>
                  </div>
                  <div className="relative">
                    <input className="w-full py-2.5 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all text-lg font-medium placeholder:text-slate-300 pr-12" placeholder={t.placeholderRu} value={newRu} onChange={e => { setNewRu(e.target.value); setDuplicateError(false); }} />
                    {newRu && (
                      <button type="button" onClick={() => setNewRu('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors">
                        <i className="fas fa-times-circle"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {duplicateError && (
                <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
                  {t.duplicateFound}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button type="submit" className="flex-1 py-3">{editingId ? t.updateBtn : t.saveBtn}</Button>
                {editingId && <Button variant="secondary" type="button" className="px-5 py-3" onClick={() => { setEditingId(null); setNewSp(''); setNewRu(''); }}>{t.cancelBtn}</Button>}
              </div>
            </form>

            {recentWords.length > 0 && (
              <div className="space-y-2 pt-2 pb-10">
                <h4 className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] flex items-center gap-2 ml-4 mb-2">{t.lastAdded}</h4>
                {recentWords.map(w => (
                  <div key={w.id} className="bg-white py-3 px-4 rounded-[22px] border border-slate-50 shadow-sm flex justify-between items-center transition-all animate-in fade-in slide-in-from-bottom-1 overflow-hidden">
                    <div className="flex-1">
                      <p className="font-black text-slate-800 text-base leading-tight">
                        <span className="text-blue-500 mr-2">{w.index}.</span>
                        {w.spanish}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">{w.russian}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={(e) => handleEdit(w, e)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${editConfirmId === w.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 active:bg-blue-50 active:text-blue-500'}`}><i className={`fas fa-${editConfirmId === w.id ? 'check' : 'pencil-alt'} text-xs`}></i></button>
                      <button type="button" onClick={(e) => handleDelete(w.id, e)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${deleteConfirmId === w.id ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-200 animate-pulse' : 'text-slate-300 active:bg-red-50 active:text-red-500'}`}><i className={`fas fa-${deleteConfirmId === w.id ? 'check' : 'trash-alt'} text-xs`}></i></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'dictionary' && (
          <div className="animate-in fade-in duration-500 flex flex-col h-full">
            <div className="sticky top-[124px] z-40 bg-[#FDFDFF] pt-2 pb-4 space-y-4 -mx-4 px-4 border-b border-slate-100/50 shadow-sm">
              <div className="relative group overflow-hidden">
                <button onClick={() => scrollAlphabet('left')} className="absolute left-0 top-0 z-20 w-10 h-[42px] bg-[#FDFDFF] border-r border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors shadow-sm"><i className="fas fa-chevron-left text-[10px]"></i></button>
                <div ref={alphabetScrollRef} className="w-full overflow-x-auto pb-1 no-scrollbar px-10 scroll-smooth">
                  <div className="flex gap-1.5 py-px">
                    {SPANISH_ALPHABET.map(letter => (
                      <button key={letter} type="button" onClick={() => setAlphabetFilter(letter)} className={`min-w-[42px] h-[42px] rounded-2xl font-black text-xs transition-all border flex items-center justify-center ${alphabetFilter === letter ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 active:bg-slate-50'}`}>{letter === 'All' ? <i className="fas fa-layer-group text-[10px]"></i> : letter}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => scrollAlphabet('right')} className="absolute right-0 top-0 z-20 w-10 h-[42px] bg-[#FDFDFF] border-l border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors shadow-sm"><i className="fas fa-chevron-right text-[10px]"></i></button>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10 text-xs"></i>
                  <input className="w-full pl-10 pr-5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all text-sm font-medium shadow-sm" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex items-center justify-between px-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.totalWords}: {filteredAndSortedWords.length}</div>
                  <div className="flex items-center gap-4 relative">
                    <select className="bg-transparent text-[10px] font-black uppercase tracking-widest text-blue-500 outline-none cursor-pointer" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
                      <option value="index">№ 1-99</option>
                      <option value="alpha-es">ES A-Z</option>
                      <option value="alpha-ru">RU A-Я</option>
                    </select>
                    {words.length > 0 && (
                      <div className="relative" ref={cleanMenuRef}>
                        <button onClick={(e) => { e.stopPropagation(); setShowCleanMenu(!showCleanMenu); }} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 active:scale-95"><i className="fas fa-broom"></i> {lang === 'ru' ? 'Очистить' : 'Clean'}</button>
                        {showCleanMenu && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-slate-100">
                            <button onClick={showLastReport} className="w-full px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-colors border-b border-slate-50 flex items-center gap-2">
                              <i className="fas fa-clipboard-list"></i> {lang === 'ru' ? 'Отчет импорта' : 'Import Report'}
                            </button>
                            <button onClick={initiateClearAll} className="w-full px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors flex items-center gap-2">
                              <i className="fas fa-trash-alt"></i> {lang === 'ru' ? 'Очистить всё' : 'Clear All'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pb-10 pt-4">
              {filteredAndSortedWords.slice(0, visibleItemsCount).map(w => (
                <div key={w.id} className="bg-white py-3 px-4 rounded-[22px] border border-slate-50 shadow-sm flex justify-between items-center transition-all group overflow-hidden">
                  <div className="flex-1">
                    <p className="font-black text-slate-800 text-base leading-tight">
                      <span className="text-blue-500 mr-2">{w.index}.</span>
                      {w.spanish}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">{w.russian}</p>
                  </div>
                  <div className="flex items-center gap-1 relative z-30">
                    <button type="button" onClick={(e) => handleEdit(w, e)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${editConfirmId === w.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 active:bg-blue-50 active:text-blue-500'}`}><i className={`fas fa-${editConfirmId === w.id ? 'check' : 'pencil-alt'} text-xs`}></i></button>
                    <button type="button" onClick={(e) => handleDelete(w.id, e)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${deleteConfirmId === w.id ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-200 animate-pulse' : 'text-slate-300 active:bg-red-50 active:text-red-500'}`}><i className={`fas fa-${deleteConfirmId === w.id ? 'check' : 'trash-alt'} text-xs`}></i></button>
                  </div>
                </div>
              ))}
              {visibleItemsCount < filteredAndSortedWords.length && (
                <button 
                  onClick={() => setVisibleItemsCount(prev => prev + ITEMS_PER_PAGE)}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 transition-colors rounded-2xl border-2 border-dashed border-blue-100 mt-2 active:scale-[0.98]"
                >
                  <i className="fas fa-plus-circle mr-2"></i>
                  {lang === 'ru' ? 'Загрузить еще' : 'Load More'}
                </button>
              )}
              <div ref={loaderRef} className="h-4"></div>
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <div className="animate-in slide-in-from-right duration-500 pt-4">
            {quizState === 'setup' ? (
              <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-2xl shadow-blue-900/5 space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center text-2xl mx-auto mb-2">
                    <i className="fas fa-sliders-h"></i>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">{t.quizRangeTitle}</h2>
                  <p className="text-slate-400 text-sm font-medium">
                    {quizRange[0]}% — {quizRange[1]}%
                  </p>
                </div>

                <div className="space-y-6">
                  <RangeSlider 
                    min={0} 
                    max={100} 
                    step={10} 
                    value={quizRange} 
                    onChange={setQuizRange} 
                  />
                  
                  <div className="bg-slate-50 p-6 rounded-[28px] flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.quizWordsCount}</p>
                      <p className="text-2xl font-black text-slate-900">
                        {Math.max(1, Math.floor(((quizRange[1] - quizRange[0]) / 100) * words.length))}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">№</p>
                      <p className="text-sm font-bold text-slate-600">
                        {Math.floor((quizRange[0] / 100) * words.length) + 1} — {Math.min(words.length, Math.floor((quizRange[1] / 100) * words.length))}
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleStartQuiz}
                  className="w-full h-16 bg-blue-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-play text-xs"></i>
                  {t.quizStartBtn}
                </button>
              </div>
            ) : isQuizFinished ? (
              <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-2xl shadow-blue-900/10 text-center space-y-8">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[32px] flex items-center justify-center text-3xl mx-auto">
                    <i className="fas fa-medal"></i>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">{lang === 'ru' ? 'Готово!' : 'Done!'}</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-6 rounded-[28px]">
                    <p className="text-[10px] font-black uppercase text-green-600 mb-2">{t.correct}</p>
                    <p className="text-3xl font-black text-green-700">{stats.correct}</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-[28px]">
                    <p className="text-[10px] font-black uppercase text-red-600 mb-2">{t.wrong}</p>
                    <p className="text-3xl font-black text-red-700">{stats.wrong}</p>
                  </div>
                </div>

                {quizHistory.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-left px-2">{t.quizHistoryTitle}</h4>
                    <div className="space-y-2">
                      {quizHistory.map((item) => (
                        <div key={item.id} className="bg-slate-50/50 p-4 rounded-[20px] flex items-center justify-between text-[11px] font-bold">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{t.totalWords}: {item.total}</span>
                            <span className="text-green-600">✓ {item.correct}</span>
                            <span className="text-red-500">✗ {item.wrong}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${item.percentage}%` }}></div>
                            </div>
                            <span className="text-blue-600 w-8 text-right">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setQuizState('setup')}
                  className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-redo text-xs"></i>
                  {t.repeatBtn}
                </button>
              </div>
            ) : (
              <div className="bg-white px-6 py-8 rounded-[40px] border border-slate-50 shadow-2xl shadow-blue-900/5 text-center space-y-6 relative overflow-hidden flex flex-col min-h-[420px]">
                <div className="flex flex-col items-start gap-4 px-2">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-700 rounded-full" 
                      style={{ width: `${((quizIndex + 1) / quizWords.length) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] font-black uppercase text-slate-300 tracking-widest">{quizIndex + 1} / {quizWords.length}</p>
                </div>
                
                <div className="flex-1 flex flex-col justify-center py-6">
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{quizWords[quizIndex].spanish}</h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {quizOptions.map((opt, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      disabled={!!quizResult} 
                      onClick={() => handleOptionSelect(opt)} 
                      className={`p-4 rounded-[20px] font-bold text-base transition-all border-2 text-left flex items-center justify-between ${
                        selectedOption === opt 
                          ? (opt === quizWords[quizIndex].russian ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') 
                          : (quizResult && opt === quizWords[quizIndex].russian ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100')
                      }`}
                    >
                      <span className="flex-1 pr-2 leading-tight">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50">
        <div className="max-w-xl mx-auto px-6 py-4 pb-8 flex items-center justify-between gap-3">
          {view === 'home' && <div className="h-2 w-full"></div>}
          {view === 'dictionary' && (
            <div className="grid grid-cols-2 w-full gap-4 h-14">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isFileProcessing} className="h-14 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest rounded-[20px] flex items-center justify-center active:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50">
                {isFileProcessing ? t.fileProcessing : t.fileUploadBtn}
              </button>
              <button type="button" onClick={handleExport} className="h-14 bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest rounded-[20px] flex items-center justify-center active:bg-emerald-800 transition-all shadow-xl shadow-emerald-100">{t.exportBtn}</button>
              <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".txt,.doc,.docx" className="hidden" />
            </div>
          )}
          {view === 'quiz' && quizState === 'playing' && !isQuizFinished && (
            <div className="grid grid-cols-2 w-full gap-4 h-14">
              <button 
                type="button" 
                onClick={() => finishQuiz()} 
                className="h-14 bg-red-500 text-white font-black text-[11px] uppercase tracking-widest rounded-[20px] flex items-center justify-center active:bg-red-600 transition-all shadow-xl shadow-red-100"
              >
                {lang === 'ru' ? 'СТОП' : 'STOP'}
              </button>
              <button 
                type="button" 
                onClick={goToNextWord} 
                disabled={!quizResult} 
                className={`h-14 font-black text-[11px] uppercase tracking-widest rounded-[20px] flex items-center justify-center transition-all ${
                  quizResult 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 active:bg-blue-700' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {t.continueBtn}
              </button>
            </div>
          )}
          {view === 'quiz' && isQuizFinished && <div className="h-2 w-full"></div>}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);