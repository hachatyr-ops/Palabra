import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Language, Word } from './types';
import { translations } from './i18n';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { getMnemonicHint, translateWord, getRandomWord, getSpanishTTS } from './services/geminiService';

type SortOption = 'alpha-es' | 'alpha-ru';
type ConfirmActionType = 'clearAll' | 'smartClean' | 'clearDuplicates' | null;

const SPANISH_ALPHABET = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const ITEMS_PER_PAGE = 30;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editConfirmId, setEditConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('alpha-es');
  const [alphabetFilter, setAlphabetFilter] = useState('All');
  const [visibleItemsCount, setVisibleItemsCount] = useState(ITEMS_PER_PAGE);
  const [showCleanMenu, setShowCleanMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [junkCount, setJunkCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const alphabetScrollRef = useRef<HTMLDivElement>(null);
  const cleanMenuRef = useRef<HTMLDivElement>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizWords, setQuizWords] = useState<Word[]>([]);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  useEffect(() => { localStorage.setItem('palabra_lang', lang); }, [lang]);
  useEffect(() => { 
    localStorage.setItem('palabra_words', JSON.stringify(words));
  }, [words]);
  useEffect(() => { 
    if (lastSavedId) localStorage.setItem('palabra_last_id', lastSavedId); 
    else localStorage.removeItem('palabra_last_id');
  }, [lastSavedId]);

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
        default: return 0;
      }
    });
    return result;
  }, [words, searchQuery, sortBy, alphabetFilter]);

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
  
  const playWordAudio = useCallback(async (word: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const base64Audio = await getSpanishTTS(word);
      if (base64Audio) {
        const bytes = decodeBase64(base64Audio);
        const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      }
    } catch (err) { console.error(err); } finally { setIsPlayingAudio(false); }
  }, [isPlayingAudio]);

  const goToNextWord = useCallback(() => {
    if (quizIndex + 1 < quizWords.length) {
      const nextIdx = quizIndex + 1;
      setQuizIndex(nextIdx);
      setSelectedOption(null);
      setQuizResult(null);
      setAiHint(null);
      const nextCorrect = quizWords[nextIdx].russian;
      const nextOthers = words.filter(w => w.russian !== nextCorrect).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.russian);
      setQuizOptions([nextCorrect, ...nextOthers].sort(() => Math.random() - 0.5));
    } else {
      setIsQuizFinished(true);
    }
  }, [quizIndex, quizWords, words]);

  const startQuiz = () => {
    if (words.length === 0) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setQuizWords(shuffled);
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizResult(null);
    setAiHint(null);
    setIsQuizFinished(false);
    setStats({ correct: 0, wrong: 0 });
    const correct = shuffled[0].russian;
    const others = words.filter(w => w.russian !== correct).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.russian);
    setQuizOptions([correct, ...others].sort(() => Math.random() - 0.5));
    setView('quiz');
  };

  const handleOptionSelect = (option: string) => {
    if (quizResult) return;
    const correct = quizWords[quizIndex].russian;
    setSelectedOption(option);
    if (option === correct) {
      setQuizResult('correct');
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      setTimeout(goToNextWord, 1200);
    } else {
      setQuizResult('wrong');
      setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSp.trim() || !newRu.trim()) return;
    const duplicate = words.find(w => w.spanish.toLowerCase() === newSp.trim().toLowerCase());
    if (duplicate && !editingId) {
      setLastSavedId(duplicate.id);
      setNewSp(''); setNewRu('');
      return;
    }
    let finalId = '';
    if (editingId) {
      setWords(words.map(w => w.id === editingId ? { ...w, spanish: newSp, russian: newRu } : w));
      finalId = editingId;
      setEditingId(null);
    } else {
      const word: Word = { id: Date.now().toString(), spanish: newSp, russian: newRu, addedAt: Date.now(), isManual: true };
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

  const getJunkIndices = () => {
    const junkPatterns = [/{/, /}/, /\[/, /\]/, /"\./, /:\s*\[/, /\.tsx/, /\.html/, /destination/, /inlineData/, /mimeType/, /base64/, /data:image/, /const\s+/, /export\s+/, /import\s+/, /return\s+/, /function\s+/, /\*\?:/];
    return words.reduce((acc, w, idx) => {
      const txt = (w.spanish + ' ' + w.russian).toLowerCase();
      const hasNoLetters = !/[a-zа-яё]/.test(txt);
      const isTooLong = w.spanish.length > 80 || w.russian.length > 80;
      const symbols = txt.match(/[?%*:\[\]{}@#$%^&()_+|~=`]/g) || [];
      const isHighDensity = symbols.length > 4;
      const isCode = junkPatterns.some(p => p.test(txt));
      if (hasNoLetters || isTooLong || isHighDensity || isCode) acc.push(idx);
      return acc;
    }, [] as number[]);
  };

  const getDuplicateIndices = () => {
    const seen = new Set<string>();
    const dupes: number[] = [];
    words.forEach((w, idx) => {
      const key = w.spanish.trim().toLowerCase();
      if (seen.has(key)) {
        dupes.push(idx);
      } else {
        seen.add(key);
      }
    });
    return dupes;
  };

  const initiateClearAll = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowCleanMenu(false); setConfirmAction('clearAll'); };

  const initiateSmartClean = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowCleanMenu(false);
    const junkIndices = getJunkIndices();
    if (junkIndices.length > 0) { setJunkCount(junkIndices.length); setConfirmAction('smartClean'); }
    else alert(lang === 'ru' ? 'Мусор не обнаружен.' : 'No junk detected.');
  };

  const initiateClearDuplicates = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowCleanMenu(false);
    const dupes = getDuplicateIndices();
    if (dupes.length > 0) { setDuplicateCount(dupes.length); setConfirmAction('clearDuplicates'); }
    else alert(lang === 'ru' ? 'Дубликаты не найдены.' : 'No duplicates found.');
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'clearAll') { setWords([]); setLastSavedId(null); }
    else if (confirmAction === 'smartClean') {
      const junkIdx = new Set(getJunkIndices());
      setWords(words.filter((_, idx) => !junkIdx.has(idx)));
    }
    else if (confirmAction === 'clearDuplicates') {
      const dupesIdx = new Set(getDuplicateIndices());
      setWords(words.filter((_, idx) => !dupesIdx.has(idx)));
    }
    setConfirmAction(null);
  };

  const handleAutoTranslate = async () => {
    if (!newSp.trim()) return;
    setIsTranslating(true);
    const translated = await translateWord(newSp, 'ru');
    if (translated) setNewRu(translated);
    setIsTranslating(false);
  };

  const handleRandomWord = async () => {
    setIsGettingRandom(true);
    const result = await getRandomWord(lang, 'All');
    setNewSp(result.spanish); setNewRu(result.russian);
    setIsGettingRandom(false); 
  };

  const handleAiHintRequest = async () => {
    setIsAiLoading(true);
    const hint = await getMnemonicHint(quizWords[quizIndex].spanish, quizWords[quizIndex].russian, lang);
    setAiHint(hint);
    setIsAiLoading(false);
  };

  const handleExport = () => {
    const textData = `${EXPORT_HEADER}\n` + words.map(w => `${w.spanish}, ${w.russian}`).join('\n');
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `palabra_export_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      if (lines[0].trim() !== EXPORT_HEADER) { alert(t.importError); return; }
      const newWords: Word[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim(); if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 2) {
          const sp = parts[0].trim(); const ru = parts[1].trim();
          if (sp.length > 0 && ru.length > 0 && sp.length < 100 && ru.length < 100)
            newWords.push({ id: (Date.now() + Math.random()).toString(), spanish: sp, russian: ru, addedAt: Date.now(), isManual: false });
        }
      }
      if (newWords.length > 0) {
        setWords(prev => {
          const existing = new Set(prev.map(w => w.spanish.toLowerCase()));
          const filtered = newWords.filter(nw => !existing.has(nw.spanish.toLowerCase()));
          return [...filtered, ...prev];
        });
        alert(`${t.importSuccess} (${newWords.length})`);
      } else alert(t.importError);
    };
    reader.readAsText(file); e.target.value = '';
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
        title={
          confirmAction === 'clearAll' ? (lang === 'ru' ? 'Удалить всё?' : 'Clear All?') :
          confirmAction === 'smartClean' ? (lang === 'ru' ? 'Очистить мусор?' : 'Smart Clean?') :
          (lang === 'ru' ? 'Удалить дубликаты?' : 'Clear Duplicates?')
        }
        message={
          confirmAction === 'clearAll' ? (lang === 'ru' ? 'Это действие навсегда удалит весь ваш словарь. Вы уверены?' : 'This will permanently delete all your words. Are you sure?') :
          confirmAction === 'smartClean' ? (lang === 'ru' ? `Найдено ${junkCount} записей мусора. Удалить их?` : `Found ${junkCount} junk items. Delete them?`) :
          (lang === 'ru' ? `Найдено ${duplicateCount} повторяющихся слов. Оставить только уникальные?` : `Found ${duplicateCount} duplicate words. Keep only unique ones?`)
        }
        confirmText={lang === 'ru' ? 'ДА, УДАЛИТЬ' : 'YES, DELETE'}
        cancelText={lang === 'ru' ? 'ОТМЕНА' : 'CANCEL'}
        variant={confirmAction === 'clearAll' ? 'danger' : 'primary'}
      />

      <main className="max-w-xl mx-auto px-4">
        <div className="sticky top-[60px] z-40 bg-white border-b border-slate-100 py-2 mb-4 -mx-4 px-4 shadow-sm">
          <div className="bg-slate-100/50 p-1.5 rounded-[22px] flex shadow-inner-sm">
            {(['home', 'dictionary', 'quiz'] as const).map(v => (
              <button key={v} type="button" onClick={() => v === 'quiz' ? startQuiz() : setView(v)} className={`flex-1 py-3.5 rounded-[18px] font-black text-[11px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 active:bg-slate-200/50'}`}>
                <i className={`fas fa-${v === 'home' ? 'plus-circle' : v === 'dictionary' ? 'book-open' : 'bolt'} ${view === v ? 'text-blue-500' : 'text-slate-300'}`}></i>
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
                  <input className="w-full py-2.5 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all text-lg font-medium placeholder:text-slate-300" placeholder={t.placeholderSp} value={newSp} onChange={e => setNewSp(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.russianLabel}</label>
                    <button type="button" onClick={handleAutoTranslate} disabled={isTranslating || !newSp.trim()} className="text-[10px] font-black uppercase bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-300 shadow-md shadow-blue-100">{isTranslating ? '...' : t.autoTranslate}</button>
                  </div>
                  <input className="w-full py-2.5 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all text-lg font-medium placeholder:text-slate-300" placeholder={t.placeholderRu} value={newRu} onChange={e => setNewRu(e.target.value)} />
                </div>
              </div>
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
                      <p className="font-black text-slate-800 text-base leading-tight">{w.spanish}</p>
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
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="relative group -mx-4 overflow-hidden">
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
                    <option value="alpha-es">ES A-Z</option>
                    <option value="alpha-ru">RU A-Я</option>
                  </select>
                  {words.length > 0 && (
                    <div className="relative" ref={cleanMenuRef}>
                      <button onClick={(e) => { e.stopPropagation(); setShowCleanMenu(!showCleanMenu); }} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 active:scale-95"><i className="fas fa-broom"></i> {lang === 'ru' ? 'Очистить' : 'Clean'}</button>
                      {showCleanMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-slate-100">
                          <button onClick={initiateSmartClean} className="w-full px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-slate-50 flex items-center gap-2">
                            <i className="fas fa-filter"></i> {lang === 'ru' ? 'Только мусор' : 'Only Junk'}
                          </button>
                          <button onClick={initiateClearDuplicates} className="w-full px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors border-b border-slate-50 flex items-center gap-2">
                            <i className="fas fa-clone"></i> {lang === 'ru' ? 'Дубликаты' : 'Duplicates'}
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

            <div className="space-y-2 pb-10">
              {filteredAndSortedWords.slice(0, visibleItemsCount).map(w => (
                <div key={w.id} className="bg-white py-3 px-4 rounded-[22px] border border-slate-50 shadow-sm flex justify-between items-center transition-all group overflow-hidden">
                  <div className="flex-1"><p className="font-black text-slate-800 text-base leading-tight">{w.spanish}</p><p className="text-[11px] font-medium text-slate-400 mt-0.5">{w.russian}</p></div>
                  <div className="flex items-center gap-1 relative z-30">
                    <button type="button" onClick={(e) => handleEdit(w, e)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${editConfirmId === w.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 active:bg-blue-50 active:text-blue-500'}`}><i className={`fas fa-${editConfirmId === w.id ? 'check' : 'pencil-alt'} text-xs`}></i></button>
                    <button type="button" onClick={(e) => handleDelete(w.id, e)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${deleteConfirmId === w.id ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-200 animate-pulse' : 'text-slate-300 active:bg-red-50 active:text-red-500'}`}><i className={`fas fa-${deleteConfirmId === w.id ? 'check' : 'trash-alt'} text-xs`}></i></button>
                  </div>
                </div>
              ))}
              <div ref={loaderRef} className="h-4"></div>
            </div>
          </div>
        )}

        {view === 'quiz' && quizWords.length > 0 && (
          <div className="animate-in slide-in-from-right duration-500 pt-2">
            {isQuizFinished ? (
              <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-2xl shadow-blue-900/10 text-center space-y-6">
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[32px] flex items-center justify-center text-3xl mx-auto"><i className="fas fa-medal"></i></div>
                <h2 className="text-3xl font-black text-slate-900">{lang === 'ru' ? 'Готово!' : 'Done!'}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-6 rounded-[28px]"><p className="text-[10px] font-black uppercase text-green-600 mb-2">{t.correct}</p><p className="text-3xl font-black text-green-700">{stats.correct}</p></div>
                  <div className="bg-red-50 p-6 rounded-[28px]"><p className="text-[10px] font-black uppercase text-red-600 mb-2">{t.wrong}</p><p className="text-3xl font-black text-red-700">{stats.wrong}</p></div>
                </div>
              </div>
            ) : (
              <div className="bg-white px-4 py-4 rounded-[32px] border border-slate-50 shadow-2xl shadow-blue-900/10 text-center space-y-4 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 h-1 bg-slate-100 w-full"><div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${((quizIndex + 1) / quizWords.length) * 100}%` }}></div></div>
                <div className="flex justify-between items-center px-1"><p className="text-[10px] font-black uppercase text-slate-300">{quizIndex + 1} / {quizWords.length}</p></div>
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{quizWords[quizIndex].spanish}</h2>
                    <button type="button" onClick={() => playWordAudio(quizWords[quizIndex].spanish)} disabled={isPlayingAudio} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all flex-shrink-0 ${isPlayingAudio ? 'bg-blue-100 text-blue-400 animate-pulse' : 'bg-blue-600 text-white active:scale-90 shadow-md shadow-blue-100'}`}><i className="fas fa-volume-up"></i></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {quizOptions.map((opt, idx) => (
                    <button key={idx} type="button" disabled={!!quizResult} onClick={() => handleOptionSelect(opt)} className={`p-3 rounded-xl font-bold text-base transition-all border-2 text-left flex items-center justify-between ${selectedOption === opt ? (opt === quizWords[quizIndex].russian ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : (quizResult && opt === quizWords[quizIndex].russian ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-600')}`}><span className="flex-1 pr-2 leading-tight">{opt}</span></button>
                  ))}
                </div>
                {aiHint && <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-100 text-[10px] text-yellow-800 italic leading-tight animate-in fade-in slide-in-from-bottom-1">{aiHint}</div>}
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50">
        <div className="max-w-xl mx-auto px-6 py-4 pb-8 flex items-center justify-between gap-3">
          {view === 'home' && <div className="h-2 w-full"></div>}
          {view === 'dictionary' && (
            <div className="grid grid-cols-2 w-full gap-3 h-12">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="h-12 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center active:bg-blue-700 transition-all shadow-lg shadow-blue-100">{t.importBtn}</button>
              <button type="button" onClick={handleExport} className="h-12 bg-green-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center active:bg-green-700 transition-all shadow-lg shadow-green-100">{t.exportBtn}</button>
              <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".txt" className="hidden" />
            </div>
          )}
          {view === 'quiz' && !isQuizFinished && (
            <div className="grid grid-cols-3 w-full gap-3 h-12">
              <button type="button" onClick={() => setIsQuizFinished(true)} className="h-12 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center active:bg-red-600 transition-all shadow-lg shadow-red-100">{t.stop}</button>
              <button type="button" onClick={handleAiHintRequest} disabled={quizResult !== 'wrong' || isAiLoading} className={`h-12 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center transition-all ${quizResult === 'wrong' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 active:bg-blue-700' : 'bg-slate-50 text-slate-200'}`}>{isAiLoading ? '...' : t.aiHelpBtn}</button>
              {quizResult === 'wrong' ? <button type="button" onClick={goToNextWord} className="h-12 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center active:bg-blue-700 shadow-lg shadow-blue-100 animate-in fade-in">{t.nextBtn}</button> : <div className="h-12"></div>}
            </div>
          )}
          {view === 'quiz' && isQuizFinished && <Button type="button" className="w-full h-14" onClick={() => setView('home')}>{lang === 'ru' ? 'ЗАВЕРШИТЬ' : 'FINISH'}</Button>}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);