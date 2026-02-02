
import React, { useState } from 'react';
import { Button } from './Button';
import { translations } from '../i18n';
import { Language } from '../types';

interface ProjectFormProps {
  onGenerate: (input: string) => void;
  isLoading: boolean;
  lang?: Language;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ onGenerate, isLoading, lang = 'ru' }) => {
  const [input, setInput] = useState('');
  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onGenerate(input);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 transition-all duration-300">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <textarea
            id="project-desc"
            className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-slate-800 placeholder:text-slate-400 text-lg leading-relaxed"
            placeholder={t.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-center">
          <Button type="submit" isLoading={isLoading} className="w-full py-4 text-lg">
            <i className="fas fa-magic"></i>
            {t.generateBtn}
          </Button>
        </div>
      </form>
    </div>
  );
};
