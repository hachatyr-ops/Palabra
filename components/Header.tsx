
import React from 'react';
import { Language } from '../types';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  langLabel: string;
}

export const Header: React.FC<HeaderProps> = ({ lang, onToggleLang, langLabel }) => {
  return (
    <header className="bg-white py-3 px-4 sticky top-0 z-50 h-[60px] flex items-center">
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 text-red-600 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm">
            <i className="fas fa-language text-lg"></i>
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight hidden xs:block">
            Pala<span className="text-red-500">bra</span>
          </h1>
        </div>

        {/* Center: Language Indicator */}
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          <span className="text-red-500">ES</span>
          <span className="opacity-50">•</span>
          <span className="text-blue-500">RU</span>
        </div>

        {/* Right: Language Switcher */}
        <div className="flex justify-end">
          <button 
            onClick={onToggleLang} 
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 active:bg-blue-50 active:text-blue-500 transition-all flex items-center gap-2 touch-manipulation"
          >
            <i className="fas fa-globe text-blue-400"></i>
            {langLabel}
          </button>
        </div>
      </div>
    </header>
  );
};
