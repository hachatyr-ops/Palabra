
import React from 'react';
import { ProjectBlueprint, Language, Translations } from '../types';
import { Button } from './Button';

interface InstructionDisplayProps {
  blueprint: ProjectBlueprint;
  onReset: () => void;
  t: Translations;
}

export const InstructionDisplay: React.FC<InstructionDisplayProps> = ({ blueprint, onReset, t }) => {
  const generateMarkdown = () => {
    let md = `# ${blueprint.name}\n\n`;
    md += `## Mission\n${blueprint.mission}\n\n`;
    md += `## Technical Stack\n`;
    blueprint.technicalStack.forEach(stack => {
      md += `### ${stack.category}\n- ${stack.items.join('\n- ')}\n\n`;
    });
    md += `## Roadmap\n`;
    blueprint.roadmap.forEach(phase => {
      md += `### ${phase.phase}\n- ${phase.tasks.join('\n- ')}\n\n`;
    });
    md += `## Guidelines\n- ${blueprint.guidelines.join('\n- ')}`;
    return md;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdown());
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 select-none pointer-events-none">
            <i className="fas fa-quote-right text-9xl"></i>
        </div>
        <div className="relative z-10">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{blueprint.name}</h2>
            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl">{blueprint.mission}</p>
        </div>
        
        <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-slate-50">
            <Button onClick={handleCopy}>
                <i className="fas fa-copy"></i> {t.copyBtn}
            </Button>
            <Button variant="secondary" onClick={onReset}>
                <i className="fas fa-redo"></i> {t.resetBtn}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tech Stack */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fas fa-layer-group text-blue-500"></i> {t.techStack}
          </h3>
          <div className="space-y-6">
            {blueprint.technicalStack.map((stack, i) => (
              <div key={i}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{stack.category}</h4>
                <div className="flex flex-wrap gap-2">
                  {stack.items.map((item, j) => (
                    <span key={j} className="px-3 py-1 bg-slate-50 text-slate-700 rounded-lg border border-slate-100 text-sm font-medium">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fas fa-clipboard-check text-green-500"></i> {t.guidelines}
          </h3>
          <ul className="space-y-3">
            {blueprint.guidelines.map((rule, i) => (
              <li key={i} className="flex gap-3 text-slate-600">
                <span className="text-blue-500 mt-1"><i className="fas fa-check-circle text-xs"></i></span>
                <span className="text-sm leading-relaxed">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Roadmap */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
          <i className="fas fa-route text-orange-500"></i> {t.roadmap}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-6 left-0 right-0 h-px bg-slate-100 -z-10"></div>
            {blueprint.roadmap.map((phase, i) => (
                <div key={i} className="relative">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold mb-4 border-4 border-white shadow-sm">
                        {i + 1}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-4">{phase.phase}</h4>
                    <ul className="space-y-2">
                        {phase.tasks.map((task, j) => (
                            <li key={j} className="text-sm text-slate-500 flex gap-2">
                                <span className="opacity-30">•</span> {task}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
